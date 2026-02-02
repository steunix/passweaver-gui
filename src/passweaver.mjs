/**
 * PassWeaver API module
 * @module src/passweaver
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as Config from './config.mjs'
import * as Crypt from './crypt.mjs'
import * as UNDICI from 'undici'

const cfg = Config.get()

const METHOD = {
  get: 'GET',
  post: 'POST',
  patch: 'PATCH',
  delete: 'DELETE'
}

const CACHE = new UNDICI.cacheStores.MemoryCacheStore({
  maxSize: cfg.server.http_cache_size_mb * 1024 * 1024,
  maxCount: 1000,
  maxEntrySize: 5 * 1024 * 1024
})

UNDICI.setGlobalDispatcher(UNDICI.getGlobalDispatcher().compose(
  UNDICI.interceptors.cache({
    store: CACHE,
    methods: ['GET', 'HEAD']
  })
))

/**
 * Get Undici cache size
 * @returns Undici cache in bytes
 */
export async function getUndiciCacheSize () {
  return CACHE.size
}

/**
 * Call PassWeaver API
 * @param {Object} session Current session
 * @param {string} method HTTP method
 * @param {string} path API path
 * @param {Object} data data for POST operations
 * @returns
 */
async function passWeaverAPI (session, method, path, data) {
  try {
    // Response skel
    const ret = {
      httpStatusCode: undefined,
      fatal: false,
      status: 'success',
      message: '',
      data: {}
    }

    // Options for fetch
    const options = {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'passweaver-gui'
      },
      method
    }

    if (data && method !== 'GET' && method !== 'HEAD') {
      options.body = JSON.stringify(data)
      options.headers['Content-Type'] = 'application/json'
    }

    if (session && session.jwt) {
      options.headers.authorization = `Bearer ${session.jwt}`
    }

    const { statusCode, body } = await UNDICI.request(cfg.passweaverapi_url + path, options)
    const payload = await body.json()
    ret.httpStatusCode = statusCode
    ret.data = payload?.data

    // OK response
    if (statusCode >= 200 && statusCode < 400) {
      return ret
    }

    // Failures
    ret.status = 'failed'
    ret.data = {}

    if (statusCode === 500) {
      ret.fatal = true
      ret.message = 'Bad request to PassWeaver API.'
    }

    // Error 401 may be expired token or bad personal password
    if (statusCode === 401) {
      // Invalid password
      if (payload.message === 'Unauthorized') {
        ret.fatal = false
        ret.message = 'Invalid password'
      }
      if (payload.message === 'Invalid token') {
        ret.fatal = true
        ret.message = 'Invalid token, you need to login'
      }
      if (payload.message === 'Token expired') {
        ret.fatal = true
        ret.message = 'Session token expired, you need to login'
      }
    }

    // Other response (404, 422, et al) or generic error
    ret.message = payload?.message

    return ret
  } catch (err) {
    // PassWeaver API not running
    return {
      httpStatusCode: undefined,
      fatal: true,
      status: 'failed',
      message: 'Error connecting to PassWeaver API, contact your administrator.',
      data: {}
    }
  }
}

/**
 * Login
 * @param {string} username User name
 * @param {string} password Password
 * @param {string} googleoauth2token Google OAuth2 token
 * @returns
 */
export async function login (username, password, googleoauth2token) {
  const resp = await passWeaverAPI(null, METHOD.post, '/login', {
    username,
    password,
    googleoauth2token
  })
  return resp
}

/**
 * Get user info
 * @param {Object} session Current session
 * @param {string} id User id
 * @returns
 */
export async function getUser (session, id) {
  const resp = await passWeaverAPI(session, METHOD.get, `/users/${id}`)

  return resp
}

/**
 * Get folders tree for current user
 * @param {Object} session Current session
 * @param {string} user User id
 * @param {boolean} permissions If true, return permissions also
 * @returns
 */
export async function userFoldersTree (session, user, permissions) {
  const resp = await passWeaverAPI(session, METHOD.get, `/users/${user}/folders?permissions=${permissions}`)
  return resp
}

/**
 * Get items list for folder
 * @param {Object} session Current session
 * @param {string} folder Folder id
 * @param {string} search Item title search
 * @param {string} type Type to search
 * @param {boolean} favorite If true, only favorite items
 * @returns
 */
export async function itemsList (session, folder, search, type, favorite) {
  let endpoint = `/folders/${folder}/items?`
  if (search) {
    endpoint += '&search=' + encodeURIComponent(search)
  }
  if (type) {
    endpoint += '&type=' + encodeURIComponent(type)
  }
  if (favorite) {
    endpoint += '&favorite=' + encodeURIComponent(favorite)
  }
  const resp = await passWeaverAPI(session, METHOD.get, endpoint)
  return resp
}

/**
 * Search items in any folder
 * @param {Object} session Current session
 * @param {string} search Item title search
 * @param {string} type Type to search
 * @param {integer} limit Results limit
 * @param {boolean} favorite If true, only favorite items
 * @returns
 */
export async function itemsSearch (session, search, type, limit, favorite) {
  let endpoint = '/items?'
  if (search) {
    endpoint += '&search=' + encodeURIComponent(search)
  }
  if (type) {
    endpoint += '&type=' + encodeURIComponent(type)
  }
  if (limit) {
    endpoint += '&limit=' + encodeURIComponent(limit)
  }
  if (favorite === 'true') {
    endpoint += '&favorite=true'
  }
  const resp = await passWeaverAPI(session, METHOD.get, endpoint)
  return resp
}

/**
 * Get folder details
 * @param {Object} session Current session
 * @param {string} folder Folder id
 * @returns
 */
export async function getFolder (session, folder) {
  const resp = await passWeaverAPI(session, METHOD.get, `/folders/${folder}`)
  return resp
}

/**
 * Create a new item
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function itemCreate (session, folder, body) {
  const data = JSON.stringify({
    description: body.data.description,
    email: body.data.email,
    url: body.data.url,
    user: body.data.user,
    password: body.data.password
  })

  const item = {
    title: body.title,
    type: body.type || undefined,
    data,
    metadata: body.data.user
  }

  const resp = await passWeaverAPI(session, METHOD.post, `/folders/${folder}/items`, item)
  return resp
}

/**
 * Clone an item
 * @param {Object} session
 * @param {string} item
 * @returns
 */
export async function itemClone (session, item) {
  const resp = await passWeaverAPI(session, METHOD.post, `/items/${item}/clone`)
  return resp
}

/**
 * Delete an item
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function itemRemove (session, item) {
  const resp = await passWeaverAPI(session, METHOD.delete, `/items/${item}`)
  return resp
}

/**
 * Get an item
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function itemGet (session, item) {
  const key = Crypt.createKey()
  const resp = await passWeaverAPI(session, METHOD.get, `/items/${item}?key=${encodeURIComponent(key)}`)

  // Decrypt item data
  if (resp.status === 'success' && resp.data?.data) {
    try {
      resp.data.data = Crypt.decryptBlock(resp.data.data, key)
    } catch (err) {
      resp.status = 'failed'
      resp.message = 'Error decrypting item data'
      resp.fatal = true
      resp.data = {}
    }
  }
  return resp
}

/**
 * Update an item
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function itemUpdate (session, itemid, body) {
  const data = JSON.stringify({
    description: body.data.description,
    email: body.data.email,
    url: body.data.url,
    user: body.data.user,
    password: body.data.password
  })

  const item = {
    title: body.title,
    type: body.type || null,
    data,
    metadata: body.data.user
  }

  const resp = await passWeaverAPI(session, METHOD.patch, `/items/${itemid}`, item)
  return resp
}

/**
 * Set item favorite flag
 * @param {Object} session
 * @param {string} itemid
 * @param {boolean} favorite
 */
export async function itemSetFavorite (session, itemid, body) {
  const resp = await passWeaverAPI(session, METHOD.patch, `/items/${itemid}`, { favorite: body.favorite })
  return resp
}

/**
 * Move an item into another folder
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function itemMove (session, itemid, body) {
  const item = {
    folder: body.folder
  }

  const resp = await passWeaverAPI(session, METHOD.patch, `/items/${itemid}`, item)
  return resp
}

/**
 * Get item activity
 * @param {Object} session Session
 * @param {string} item Item ID
 * @param {string} lastid Last id read
 * @returns
 */
export async function itemActivity (session, item, lastid) {
  const li = lastid || ''
  const resp = await passWeaverAPI(session, METHOD.get, `/items/${item}/activity?lastid=${li}`)
  return resp
}

/**
 * Get item link
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} item Item ID
 * @returns
 */
export async function itemLink (req, session, item, lastid) {
  const resp = {
    httpStatusCode: '200',
    fatal: false,
    status: 'success',
    message: '',
    data: {}
  }

  resp.data.link = `${req.protocol + '://' + req.host}/pages/items?viewitem=${item}`

  // If no public URL is set, use the local one
  if (Config.get().server.item_link_server) {
    resp.data.link = `${Config.get().server.item_link_server}/pages/items?viewitem=${item}`
  }

  return resp
}

/**
 * Read item password event
 * @param {Object} session
 * @param {string} item
 * @returns
 */
export async function itemPasswordRead (session, item) {
  const resp = await passWeaverAPI(session, METHOD.post, `/items/${item}/passwordread`, {})
  return resp
}

/**
 * Copied item password event
 * @param {Object} session
 * @param {string} item
 * @returns
 */
export async function itemPasswordCopied (session, item) {
  const resp = await passWeaverAPI(session, METHOD.post, `/items/${item}/passwordcopied`, {})
  return resp
}

/**
 * Create a new folder
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function folderCreate (session, folder, body) {
  const data = {
    description: body.description
  }

  const resp = await passWeaverAPI(session, METHOD.post, `/folders/${folder}/folders`, data)
  return resp
}

/**
 * Delete a folder
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function folderRemove (session, folder) {
  const resp = await passWeaverAPI(session, METHOD.delete, `/folders/${folder}`)
  return resp
}

/**
 * Update a folder
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function folderUpdate (session, folder, body) {
  const data = {}
  if (body?.description) {
    data.description = body.description
  }
  if (body?.parent) {
    data.parent = body.parent
  }

  const resp = await passWeaverAPI(session, METHOD.patch, `/folders/${folder}`, data)
  return resp
}

/**
 * Get groups tree
 * @param {Object} session Current session
 * @returns
 */
export async function groupsTree (session) {
  const resp = await passWeaverAPI(session, METHOD.get, '/groups/tree')
  return resp
}

/**
 * Users list
 * @param {Object} session Current session
 * @param {string} group Group id
 * @returns
 */
export async function usersList (session, group, search) {
  let url

  if (group) {
    url = `/groups/${group}/users`
  } else {
    url = '/users'
  }

  if (search) {
    url += `/?search=${search}`
  }

  const resp = await passWeaverAPI(session, METHOD.get, url)
  return resp
}

/**
 * Create a new group
 * @param {Object} session
 * @param {string} group
 * @param {Object} body
 * @returns
 */
export async function groupCreate (session, group, body) {
  const data = {
    description: body.description
  }

  const resp = await passWeaverAPI(session, METHOD.post, `/groups/${group}/groups`, data)
  return resp
}

/**
 * Get group details
 * @param {Object} session Current session
 * @param {string} group Group id
 * @returns
 */
export async function getGroup (session, group) {
  const resp = await passWeaverAPI(session, METHOD.get, `/groups/${group}`)
  return resp
}

/**
 * Update a group
 * @param {Object} session
 * @param {string} group
 * @param {Object} body
 * @returns
 */
export async function groupUpdate (session, group, body) {
  const data = {}
  if (body?.description) {
    data.description = body.description
  }
  if (body?.parent) {
    data.parent = body.parent
  }

  const resp = await passWeaverAPI(session, METHOD.patch, `/groups/${group}`, data)
  return resp
}

/**
 * Delete a group
 * @param {Object} session
 * @param {string} group
 * @param {Object} body
 * @returns
 */
export async function groupRemove (session, group) {
  const resp = await passWeaverAPI(session, METHOD.delete, `/groups/${group}`)
  return resp
}

/**
 * Add a user to group
 * @param {*} session
 * @param {*} group
 * @param {*} user
 */
export async function groupAddUser (session, group, user) {
  const resp = await passWeaverAPI(session, METHOD.post, `/groups/${group}/users/${user}`)
  return resp
}

/**
 * Delete user from group
 * @param {*} session
 * @param {*} group
 * @param {*} user
 */
export async function groupRemoveUser (session, group, user) {
  const resp = await passWeaverAPI(session, METHOD.delete, `/groups/${group}/users/${user}`)
  return resp
}

/**
 * Create a user
 * @param {Object} session Session object
 * @param {Object} userData User data
 * @returns
 */
export async function userCreate (session, userData) {
  const resp = await passWeaverAPI(session, METHOD.post, '/users/', userData)
  return resp
}

/**
 * Get a user
 * @param {Object} session
 * @param {Object} user
 * @returns
 */
export async function userGet (session, user) {
  const resp = await passWeaverAPI(session, METHOD.get, `/users/${user}`)
  return resp
}

/**
 * Update a user
 * @param {Object} session
 * @param {string} user
 * @param {Object} body
 * @returns
 */
export async function userUpdate (session, user, body) {
  // Recalc data so it cannot be injected
  const data = {
    login: body.login,
    email: body.email,
    lastname: body.lastname,
    firstname: body.firstname,
    locale: body.locale,
    authmethod: body.authmethod,
    active: body.active
  }

  const resp = await passWeaverAPI(session, METHOD.patch, `/users/${user}`, data)
  return resp
}

/**
 * Get user activity
 * @param {Object} session Session
 * @param {string} user User ID
 * @param {string} lastid Last id read
 * @returns
 */
export async function userActivity (session, user, lastid) {
  const li = lastid || ''
  const resp = await passWeaverAPI(session, METHOD.get, `/users/${user}/activity?lastid=${li}`)
  return resp
}

/**
 * Get folder groups
 * @param {Object} session
 * @param {string} folder
 */
export async function folderGroups (session, folder) {
  const resp = await passWeaverAPI(session, METHOD.get, `/folders/${folder}/groups`)
  return resp
}

/**
 * Get user groups
 * @param {Object} session Session object
 * @param {string} user User ID
 */
export async function userGroups (session, user) {
  const resp = await passWeaverAPI(session, METHOD.get, `/users/${user}/groups`)
  return resp
}

/**
 * Add a group to a folder
 * @param {Object} session Session object
 * @param {string} folder Folder
 * @param {string} group Group to add
 * @returns
 */
export async function folderAddGroup (session, folder, group) {
  const data = {
    read: true,
    write: false
  }

  const resp = await passWeaverAPI(session, METHOD.post, `/folders/${folder}/groups/${group}`, data)
  return resp
}

/**
 * Remove a group from folder
 * @param {Object} session Session object
 * @param {string} folder Folder
 * @param {string} group Group to remove
 * @returns
 */
export async function folderRemoveGroup (session, folder, group) {
  const resp = await passWeaverAPI(session, METHOD.delete, `/folders/${folder}/groups/${group}`)
  return resp
}

/**
 * Toggle group permissions on folder
 * @param {Object} session Session object
 * @param {string} folder Folder
 * @param {string} group Group to remove
 * @returns
 */
export async function folderToggleGroup (session, folder, group) {
  const perm = await passWeaverAPI(session, METHOD.get, `/folders/${folder}/groups`)

  for (const g of perm.data) {
    if (g.id === group) {
      const resp = await passWeaverAPI(session, METHOD.patch, `/folders/${folder}/groups/${group}`, { read: true, write: !g.write })
      return resp
    }
  }

  return perm
}

/**
 * Groups list
 * @param {Object} session Current session
 * @returns
 */
export async function groupsList (session, search) {
  let url = '/groups/'

  if (search) {
    url += `/?search=${search}`
  }
  const resp = await passWeaverAPI(session, METHOD.get, url)
  return resp
}

/**
 * Get folders tree for a group
 * @param {Object} session Current session
 * @param {string} group Group ID
 * @returns
 */
export async function groupFoldersTree (session, group) {
  const resp = await passWeaverAPI(session, METHOD.get, `/groups/${group}/folders`)
  return resp
}

/**
 * Delete an user
 * @param {Object} session Session object
 * @param {string} user User
 * @returns
 */
export async function userRemove (session, user) {
  const resp = await passWeaverAPI(session, METHOD.delete, `/users/${user}`)
  return resp
}

/**
 * Generate a password
 * @param {Object} session Session
 * @param {string} symbols true or false, include symbols or not in the password
 * @param {number} length Password length
 * @returns
 */
export async function generatePassword (session, symbols, length) {
  const resp = await passWeaverAPI(session, METHOD.get, `/util/generatepassword?symbols=${symbols || true}&length=${length || Config.get().generate_password_length || 15}`)
  return resp
}

/**
 * Create personal password
 * @param {Object} session Session
 * @param {string} password Password
 * @returns
 */
export async function personalPasswordCreate (req, session, password) {
  const resp = await passWeaverAPI(session, METHOD.post, '/personal/password', {
    password
  })

  // If successfull, unlock personal folder directly
  if (resp.httpStatusCode === 200) {
    req.session.jwt = resp.data.jwt
    req.session.save()
  }

  return resp
}

/**
 * Reset personal password
 * @param {Object} session Session
 * @param {string} password Password
 * @returns
 */
export async function personalPasswordReset (req, session, password) {
  const resp = await passWeaverAPI(session, METHOD.delete, '/personal/password')
  return resp
}

/**
 * Unlock personal folders
 * @param {Object} session Session
 * @param {string} passsword Password
 * @returns
 */
export async function personalUnlock (req, session, password) {
  const resp = await passWeaverAPI(session, METHOD.post, '/personal/unlock', {
    password
  })

  if (resp.httpStatusCode === 200) {
    req.session.jwt = resp.data.jwt
    req.session.save()
  }

  return resp
}

/**
 * Change personal password
 * @param {Object} session Session
 * @param {string} password Password
 * @returns
 */
export async function personalPasswordChange (session, password) {
  const resp = await passWeaverAPI(session, METHOD.patch, '/personal/password', {
    password
  })

  // If successfull, unlock personal folder directly
  if (resp.httpStatusCode === 200) {
    session.jwt = resp.data.jwt
    session.save()
  }

  return resp
}

/**
 * Add an event
 * @param {Object} session Session
 * @param {string} event Event code
 * @param {string} entity Entity code
 * @param {string} entityid Entity id
 * @returns
 */
export async function addEvent (session, event, entity, entityid) {
  const data = {
    event,
    entity,
    entityid
  }

  const resp = await passWeaverAPI(session, METHOD.post, '/events', data)
  return resp
}

/**
 * Item types list
 * @param {Object} session Session
 * @param {Object} search Search string
 * @returns
 */
export async function itemTypesList (session, search) {
  const resp = await passWeaverAPI(session, METHOD.get, `/itemtypes?search=${search}`)
  return resp
}

/**
 * New item type
 * @param {Object} session Session
 * @param {string} description Description
 * @param {string} icon Icon
 * @returns
 */
export async function itemTypeCreate (session, description, icon) {
  const data = {
    description,
    icon
  }

  const resp = await passWeaverAPI(session, METHOD.post, '/itemtypes', data)
  return resp
}

/**
 * Delete item type
 * @param {Object} session Session
 * @param {string} id Item type id
 * @returns
 */
export async function itemTypeRemove (session, id) {
  const resp = await passWeaverAPI(session, METHOD.delete, `/itemtypes/${id}`)
  return resp
}

/**
 * Get item type
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} id Item type id
 * @returns
 */
export async function itemTypeGet (session, id) {
  const resp = await passWeaverAPI(session, METHOD.get, `/itemtypes/${id}`)
  return resp
}

/**
 * Edit item type
 * @param {Object} session Session
 * @param {string} description Description
 * @param {string} icon Icon
 * @returns
 */
export async function itemTypeEdit (session, id, description, icon) {
  const data = {
    description,
    icon
  }

  const resp = await passWeaverAPI(session, METHOD.patch, `/itemtypes/${id}`, data)
  return resp
}

/**
 * KMS list
 * @param {Object} session Session
 * @param {Object} search Search string
 * @returns
 */
export async function kmsList (session, search) {
  const resp = await passWeaverAPI(session, METHOD.get, '/kms?search=' + encodeURIComponent(search))
  return resp
}

/**
 * New KMS
 * @param {Object} session Session
 * @param {string} description Description
 * @param {string} type Type
 * @param {string} active Active
 * @param {string} config Config
 * @returns
 */
export async function kmsCreate (session, description, type, active, config) {
  const data = {
    description,
    type: parseInt(type),
    active,
    config
  }

  const resp = await passWeaverAPI(session, METHOD.post, '/kms', data)
  return resp
}

/**
 * Delete KMS
 * @param {Object} session Session
 * @param {string} id Item type id
 * @returns
 */
export async function kmsRemove (session, id) {
  const resp = await passWeaverAPI(session, METHOD.delete, `/kms/${id}`)
  return resp
}

/**
 * Get KMS
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} id Item type id
 * @returns
 */
export async function kmsGet (session, id) {
  const resp = await passWeaverAPI(session, METHOD.get, `/kms/${id}`)
  return resp
}

/**
 * Edit KMS
 * @param {Object} session Session
 * @param {string} id KMS id
 * @param {string} description Description
 * @param {string} type Type
 * @param {string} active Active
 * @param {string} config Config
 * @returns
 */
export async function kmsEdit (session, id, description, type, active, config) {
  const data = {
    description,
    type: parseInt(type),
    active,
    config
  }

  const resp = await passWeaverAPI(session, METHOD.patch, `/kms/${id}`, data)
  return resp
}

//
/**
 * API keys list
 * @param {Object} session Session
 * @param {Object} search Search string
 * @param {string} userid User id
 * @returns
 */
export async function apikeysList (session, search, userid) {
  const resp = await passWeaverAPI(session, METHOD.get, '/apikeys?search=' + encodeURIComponent(search) + '&userid=' + encodeURIComponent(userid))
  return resp
}

/**
 * New API key
 * @param {Object} session Session
 * @param {string} description Description
 * @param {string} userid User id
 * @param {string} expiresat Expiration date
 * @param {string} active Active
 * @param {string} ipwhitelist IP whitelist
 * @param {string} timewhitelist Time whitelist
 * @returns
 */
export async function apikeysCreate (session, description, userid, expiresat, active, ipwhitelist, timewhitelist) {
  const data = {
    description,
    userid,
    expiresat,
    active,
    ipwhitelist,
    timewhitelist
  }

  const resp = await passWeaverAPI(session, METHOD.post, '/apikeys', data)
  return resp
}

/**
 * Delete API key
 * @param {Object} session Session
 * @param {string} id Item type id
 * @returns
 */
export async function apikeysRemove (session, id) {
  const resp = await passWeaverAPI(session, METHOD.delete, `/apikeys/${id}`)
  return resp
}

/**
 * Get API key
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} id Item type id
 * @returns
 */
export async function apikeysGet (session, id) {
  const resp = await passWeaverAPI(session, METHOD.get, `/apikeys/${id}`)
  return resp
}

/**
 * Edit API key
 * @param {Object} session Session
 * @param {string} id API key id
 * @param {string} description Description
 * @param {string} userid User id
 * @param {string} expiresat Expiration date
 * @param {string} active Active
 * @param {string} ipwhitelist IP whitelist
 * @param {string} timewhitelist Time whitelist
 * @returns
 */
export async function apikeysEdit (session, id, description, userid, expiresat, active, ipwhitelist, timewhitelist) {
  const data = {
    description,
    userid,
    expiresat,
    active,
    ipwhitelist,
    timewhitelist
  }

  const resp = await passWeaverAPI(session, METHOD.patch, `/apikeys/${id}`, data)
  return resp
}

/**
 * Info
 * @param {Object} session Session
 * @returns
 */
export async function info (session) {
  const resp = await passWeaverAPI(session, METHOD.get, '/util/info')
  return resp
}

/**
 * Version
 * @returns
 */
export async function version () {
  const resp = await passWeaverAPI(null, METHOD.get, '/version')
  return resp
}

/**
 * Get user preferences
 * @param {*} session
 */
export async function preferencesGet (session) {
  const resp = await passWeaverAPI(session, METHOD.get, `/users/${session.user}/settings`)
  return resp
}

/**
 * Set user preferences
 * @param {*} req
 * @param {*} session
 */
export async function preferencesSet (req, session) {
  const prefs = [
    { setting: 'theme', value: req.body.theme },
    { setting: 'font', value: req.body.font }
  ]

  const resp = await passWeaverAPI(session, METHOD.post, `/users/${session.user}/settings`, prefs)
  return resp
}

/**
 * Create one time secret
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} data Data
 * @param {string} scope Token scope
 * @param {string} userid User ID if scope is 2
 * @returns
 */
export async function oneTimeSecretCreate (req, session, data, scope, userid) {
  const payload = {
    type: 0,
    scope: parseInt(scope),
    data,
    hours: Config.get().onetimetokens.default_hours
  }
  if (scope === '2') {
    payload.userid = userid
  }

  const resp = await passWeaverAPI(session, METHOD.post, '/onetimetokens', payload)
  if (resp.status === 'success') {
    resp.data.link = `${req.protocol + '://' + req.host}/onetimesecret/${resp.data.token}`

    // If no public URL is set, use the local one
    if (scope === '0' && Config.get().server.onetimesecret_public_server) {
      resp.data.link = `${Config.get().server.onetimesecret_public_server}/noauth/onetimesecret/${resp.data.token}`
    }
  }
  return resp
}

/**
 * Create one time item share
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} itemid Item id
 * @param {string} scope Token scope
 * @param {string} userid User ID if scope is 2
 * @param {integer} hours Expires after these hours
 * @returns
 */
export async function oneTimeShareCreate (req, session, itemid, scope, userid) {
  const payload = {
    type: 1,
    scope: parseInt(scope),
    itemid,
    hours: Config.get().onetimetokens.default_hours
  }
  if (scope === '2') {
    payload.userid = userid
  }
  const resp = await passWeaverAPI(session, METHOD.post, '/onetimetokens', payload)
  if (resp.status === 'success') {
    resp.data.link = `${req.protocol + '://' + req.host}/onetimesecret/${resp.data.token}`

    // If no public URL is set, use the local one
    if (scope === '0' && Config.get().server.onetimesecret_public_server) {
      resp.data.link = `${Config.get().server.onetimesecret_public_server}/noauth/onetimesecret/${resp.data.token}`
    }
  }
  return resp
}

/**
 * Get one time secret
 * @param {Object} session Session
 * @param {string} token Item type id
 */
export async function oneTimeSecretGet (session, token) {
  const key = Crypt.createKey()
  const resp = await passWeaverAPI(session, METHOD.get, `/onetimetokens/${token}?key=${encodeURIComponent(key)}`)

  if (resp?.data.secret) {
    resp.data.secret = Crypt.decryptBlock(resp.data.secret, key)
  }
  if (resp?.data?.item) {
    resp.data.item = JSON.parse(Crypt.decryptBlock(resp.data.item, key))
  }

  return resp
}

/**
 * Change user password
 * @param {Object} session Session
 * @param {string} newpassword New password
 */
export async function passwordChange (session, newpassword) {
  const userData = {
    secret: newpassword
  }

  const resp = await passWeaverAPI(session, METHOD.patch, `/users/${session.user}`, userData)
  return resp
}

/**
 * Clear the cache
 * @param {Object} session Session
 */
export async function clearCache (session) {
  const resp = await passWeaverAPI(session, METHOD.post, '/util/clearcache', {})
  return resp
}

/**
 * Get read only status
 * @param {Object} session Session
 */
export async function readOnlyStatus (session) {
  const resp = await passWeaverAPI(session, METHOD.get, '/util/systemreadonly')
  return resp
}

/**
 * Set system read only status
 * @param {Object} session Session
 * @param {boolean} readonly Read only status
 */
export async function systemReadOnly (session, readonly) {
  const resp = await passWeaverAPI(session, METHOD.post, `/util/${readonly ? 'systemreadonly' : 'systemreadwrite'}`)
  return resp
}

/**
 * Get system lock status
 * @param {Object} session Session
 */
export async function systemLockStatus (session) {
  const resp = await passWeaverAPI(session, METHOD.get, '/util/systemlock')
  return resp
}

/**
 * Set system lock status
 * @param {Object} session Session
 * @param {boolean} lock Lock status
 */
export async function systemLock (session, lock) {
  const resp = await passWeaverAPI(session, METHOD.post, `/util/${lock ? 'systemlock' : 'systemunlock'}`)
  return resp
}

/** Create item link */
export async function linkCreate (req, session, folderid, itemid) {
  const resp = await passWeaverAPI(session, METHOD.post, `/folders/${folderid}/linkeditems`, {
    linkeditemid: itemid
  })
  return resp
}
