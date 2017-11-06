import axios from 'axios'

import { PORT } from '../web-config'

const baseUrl = `http://localhost:${PORT}`

export function getAllFile (path) {
  const folderPath = `${baseUrl}/` + (path ? `${path}/` : '')
  return axios.get(folderPath)
    .then(res => res.data)
}

export function getFile (path) {
  return axios.get(`${baseUrl}/${path}`)
    .then(res => res.data)
}

export function createFolder (path, name) {
  return axios.put(`${baseUrl}/${path}/${name}/`)
}

export function createFile (path, name, content) {
  return axios.put(`${baseUrl}/${path}/${name}`, content)
}

function deleteFolderHelper (path, name = '') {
  return axios.delete(`${baseUrl}/${path}/${name}/`)
}

export async function deleteFolder (path) {
  const data = await getAllFile(path)
  if (data.length === 0) {
    return await deleteFolderHelper(path)
  }
  for (let item of data) {
    const name = item.name
    if (item.mime !== 'inode/directory') {
      await deleteFile(path, name)
    } else {
      await deleteFolder(`${path}/${name}`)
    }
  }
  return await deleteFolderHelper(path)
}

export function deleteFile (path, name) {
  return axios.delete(`${baseUrl}/${path}/${name}`)
}

export async function formatFolder () {
  const data = await getAllFile('tmp')
  for (let item of data) {
    const name = item.name
    if (item.mime !== 'inode/directory') {
      await deleteFile('tmp', name)
    } else {
      await deleteFolder(`tmp/${name}`)
    }
  }
}

export function modifyFile (path, content) {
  return deleteFile(path, content.oldName)
    .then(_ => createFile(path, content.name, content.content))
}

