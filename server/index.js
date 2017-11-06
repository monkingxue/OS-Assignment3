const {PORT} = require("../web-config.js")

let local = require('./fs-local')({
  root: __dirname + '/'
})

require('http').createServer(require('stack')(
  cors,
  require('./http-adapter')('/', local)
)).listen(PORT)

function cors (req, res, next) {
  // set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Request-Method', '*')
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, DELETE, POST, PUT')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }
  next()
}

console.log(`HTTP server at http://localhost:${PORT}/`)
