let urlParse = require('url').parse
let multipart = require('./multipart')
let Stream = require('stream').Stream
let pathJoin = require('path').join

module.exports = function setup (mount, vfs) {

  // Returns a json stream that wraps input object stream
  function jsonEncoder (input, path) {
    let output = new Stream()
    output.readable = true
    let first = true
    input.on('data', function (entry) {
      if (path) {
        entry.href = path + entry.name
        let mime = entry.linkStat ? entry.linkStat.mime : entry.mime
        if (mime.match(/(directory|folder)$/)) {
          entry.href += '/'
        }
      }
      if (first) {
        output.emit('data', '[\n  ' + JSON.stringify(entry))
        first = false
      } else {
        output.emit('data', ',\n  ' + JSON.stringify(entry))
      }
    })
    input.on('end', function () {
      if (first) output.emit('data', '[]')
      else output.emit('data', '\n]')
      output.emit('end')
    })
    if (input.pause) {
      output.pause = function () {
        input.pause()
      }
    }
    if (input.resume) {
      output.resume = function () {
        input.resume()
      }
    }
    return output
  }

  return function (req, res, next) {

    if (!req.uri) { req.uri = urlParse(req.url) }

    if (mount[mount.length - 1] !== '/') mount += '/'

    let path = unescape(req.uri.pathname)
    // no need to sanitize the url (remove ../..) the vfs layer has this
    // responsibility since it can do it better with realpath.
    if (path.substr(0, mount.length) !== mount) { return next() }
    path = path.substr(mount.length - 1)

    // Instead of using next for errors, we send a custom response here.
    function abort (err, code) {
      console.error(err.stack || err)
      if (code) res.statusCode = code
      else if (err.code === 'EBADREQUEST') res.statusCode = 400
      else if (err.code === 'EACCESS') res.statusCode = 403
      else if (err.code === 'ENOENT') res.statusCode = 404
      else if (err.code === 'ENOTREADY') res.statusCode = 503
      else res.statusCode = 500
      let message = (err.stack || err) + '\n'
      res.setHeader('Content-Type', 'text/plain')
      res.setHeader('Content-Length', Buffer.byteLength(message))
      res.end(message)
    }

    let options = {}
    if (req.method === 'HEAD') {
      options.head = true
      req.method = 'GET'
    }

    if (req.method === 'GET') {

      if (req.headers.hasOwnProperty('if-none-match')) options.etag = req.headers['if-none-match']

      if (req.headers.hasOwnProperty('range')) {
        let range = options.range = {}
        let p = req.headers.range.indexOf('=')
        let parts = req.headers.range.substr(p + 1).split('-')
        if (parts[0].length) {
          range.start = parseInt(parts[0], 10)
        }
        if (parts[1].length) {
          range.end = parseInt(parts[1], 10)
        }
        if (req.headers.hasOwnProperty('if-range')) range.etag = req.headers['if-range']
      }

      if (path[path.length - 1] === '/') {
        options.encoding = null // Use raw objects for data events
        vfs.readdir(path, options, onGet)
      } else {
        vfs.readfile(path, options, onGet)
      }

      function onGet (err, meta) {
        res.setHeader('Date', (new Date()).toUTCString())
        if (err) return abort(err)
        if (meta.rangeNotSatisfiable) return abort(meta.rangeNotSatisfiable, 416)

        if (meta.hasOwnProperty('etag')) res.setHeader('ETag', meta.etag)

        if (meta.notModified) res.statusCode = 304
        if (meta.partialContent) res.statusCode = 206

        if (meta.hasOwnProperty('stream') || options.head) {
          if (meta.hasOwnProperty('mime')) res.setHeader('Content-Type', meta.mime)
          if (meta.hasOwnProperty('size')) {
            res.setHeader('Content-Length', meta.size)
            if (meta.hasOwnProperty('partialContent')) {
              res.setHeader('Content-Range', 'bytes ' + meta.partialContent.start + '-' + meta.partialContent.end + '/' + meta.partialContent.size)
            }
          }
        }
        if (meta.hasOwnProperty('stream')) {
          meta.stream.on('error', abort)
          if (options.encoding === null) {
            res.setHeader('Content-Type', 'application/json')
            let base = (req.socket.encrypted ? 'https://' : 'http://') + req.headers.host + pathJoin(mount, path)
            jsonEncoder(meta.stream, base).pipe(res)
          } else {
            meta.stream.pipe(res)
          }
          req.on('close', function () {
            if (meta.stream.readable) {
              meta.stream.destroy()
              meta.stream.readable = false
            }
          })
        } else {
          res.end()
        }
      }

    } // end GET request

    else if (req.method === 'PUT') {

      if (path[path.length - 1] === '/') {
        vfs.mkdir(path, {}, function (err, meta) {
          if (err) return abort(err)
          res.end()
        })
      } else {

        // Pause the stream and record any events
        let events = []

        function onData (chunk) {
          events.push(['data', chunk])
        }

        function onEnd () {
          events.push(['end'])
        }

        req.pause()
        req.on('data', onData)
        req.on('end', onEnd)

        vfs.mkfile(path, {}, function (err, meta) {
          if (err) return abort(err)
          if (meta.stream) {
            meta.stream.on('error', abort)
            req.pipe(meta.stream)

            // Resume the stream and emit any missing events
            req.removeListener('data', onData)
            req.removeListener('end', onEnd)
            for (let i = 0, l = events.length; i < l; i++) {
              req.emit.apply(req, events[i])
            }
            req.resume()

            meta.stream.on('saved', function () {
              res.end()
            })
          } else {
            res.end()
          }
        })
      }
    } // end PUT request

    else if (req.method === 'DELETE') {
      let command
      if (path[path.length - 1] === '/') {
        command = vfs.rmdir
      } else {
        command = vfs.rmfile
      }
      command(path, {}, function (err, meta) {
        if (err) return abort(err)
        res.end()
      })
    } // end DELETE request

    else if (req.method === 'POST') {

      if (path[path.length - 1] === '/') {
        let contentType = req.headers['content-type']
        if (!contentType) {
          return abort(new Error('Missing Content-Type header'), 400)
        }
        if (!(/multipart/i).test(contentType)) {
          return abort(new Error('Content-Type should be multipart'), 400)
        }
        let match = contentType.match(/boundary=(?:'([^']+)'|([^;]+))/i)
        if (!match) {
          return abort(new Error('Missing multipart boundary'), 400)
        }
        let boundary = match[1] || match[2]

        let parser = multipart(req, boundary)

        parser.on('part', function (stream) {
          let contentDisposition = stream.headers['content-disposition']
          if (!contentDisposition) {
            return parser.error('Missing Content-Disposition header in part')
          }
          let match = contentDisposition.match(/filename='([^']*)'/)
          if (!match) {
            return parser.error('Missing filename in Content-Disposition header in part')
          }
          let filename = match[1]

          stream.buffer()
          vfs.mkfile(path + '/' + filename, {}, function (err, meta) {
            if (err) return abort(err)
            if (meta.stream) {
              meta.stream.on('error', abort)
              stream.pipe(meta.stream)
              stream.flush()
            }
          })
        })
        parser.on('error', abort)
        parser.on('end', function () {
          res.end()
        })
        return
      }

      let data = ''
      req.on('data', function (chunk) {
        data += chunk
      })
      req.on('end', function () {
        let message
        try {
          message = JSON.parse(data)
        } catch (err) {
          return abort(err)
        }
        let command, options = {}
        if (message.renameFrom) {
          command = vfs.rename
          options.from = message.renameFrom
        }
        else if (message.copyFrom) {
          command = vfs.copy
          options.from = message.copyFrom
        }
        else if (message.linkTo) {
          command = vfs.symlink
          options.target = message.linkTo
        }
        else {
          return abort(new Error('Invalid command in POST ' + data))
        }
        command(path, options, function (err, meta) {
          if (err) return abort(err)
          res.end()
        })
      })
    } // end POST commands
    else if (req.method === 'PROPFIND') {
      vfs.stat(path, {}, function (err, meta) {
        if (err) return abort(err)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(meta) + '\n')
      })
    }
    else if (req.method === 'OPTIONS') {
      next()
    }
    else {
      return abort('Unsupported HTTP method ' + req.method, 501)
    }

  }

}

