/**
 * PassWeaver API module
 * @module src/passweaver
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import * as Config from './config.mjs'

const cfg = Config.get()

const METHOD = {
  get: 'GET',
  post: 'POST',
  patch: 'PATCH',
  delete: 'DELETE'
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
        'User-Agent': 'passweaver-gui',
        'Content-Type': 'application/json'
      },
      method
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    if (session && session.jwt) {
      options.headers.authorization = `Bearer ${session.jwt}`
    }
    const resp = await fetch(cfg.passweaverapi_url + path, options)
    const body = await resp.json()

    ret.httpStatusCode = resp.status
    ret.data = body?.data

    // OK response
    if (resp.ok) {
      return ret
    }

    // Failures
    ret.status = 'failed'
    ret.data = {}

    if (resp.status === 500) {
      ret.fatal = true
      ret.message = 'Bad request to PassWeaver API.'
    }

    // Error 401 may be expired token or bad personal password
    if (resp.status === 401) {
      // Invalid password
      if (body.message === 'Unauthorized') {
        ret.fatal = false
        ret.message = 'Invalid password'
      }
      if (body.message === 'Invalid token') {
        ret.fatal = true
        ret.message = 'Invalid token, you need to login'
      }
      if (body.message === 'Token expired') {
        ret.fatal = true
        ret.message = 'Session token expired, you need to login'
      }
    }

    // Other response (404, 422, et al) or generic error
    ret.message = body?.message

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
 * @returns
 */
export async function login (username, password) {
  const resp = await passWeaverAPI(null, METHOD.post, '/login', {
    username,
    password
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
 * @returns
 */
export async function itemsList (session, folder, search, type) {
  const resp = await passWeaverAPI(session, METHOD.get,
    `/folders/${folder}/items?search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}`)
  return resp
}

/**
 * Search items in any folder
 * @param {Object} session Current session
 * @param {string} search Item title search
 * @returns
 */
export async function itemsSearch (session, search, type) {
  const resp = await passWeaverAPI(session, METHOD.get, `/items?search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}`)
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
  const item = {
    title: body.title,
    type: body.type || undefined,
    metadata: body.user,
    data: JSON.stringify({
      description: body.description,
      email: body.email,
      url: body.url,
      user: body.user,
      password: body.password
    })
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
  const resp = await passWeaverAPI(session, METHOD.get, `/items/${item}`)
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
 * @returns
 */
export async function generatePassword (session, symbols) {
  const resp = await passWeaverAPI(session, METHOD.get, `/util/generatepassword?symbols=${symbols || true}`)
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
export async function personalPasswordChange (req, session, password) {
  const resp = await passWeaverAPI(session, METHOD.patch, '/personal/password', {
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
 * @returns
 */
export async function itemTypesList (session) {
  const resp = await passWeaverAPI(session, METHOD.get, '/itemtypes')
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
    { setting: 'theme', value: req.body.theme }
  ]

  const resp = await passWeaverAPI(session, METHOD.post, `/users/${session.user}/settings`, prefs)
  return resp
}

/**
 * Create one time secret
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} data Data
 * @param {integer} hours Expires after these hours
 * @returns
 */
export async function oneTimeSecretCreate (session, data) {
  const resp = await passWeaverAPI(session, METHOD.post, '/onetimetokens', { type: 0, scope: 0, data, hours: Config.get().onetimetokens.default_hours })
  return resp
}

/**
 * Create one time item share
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} itemid Item id
 * @param {integer} hours Expires after these hours
 * @returns
 */
export async function oneTimeShareCreate (session, itemid) {
  const resp = await passWeaverAPI(session, METHOD.post, '/onetimetokens', { type: 1, scope: 0, itemid, hours: Config.get().onetimetokens.default_hours })
  return resp
}

/**
 * Get one time secret
 * @param {Object} session Session
 * @param {string} token Item type id
 */
export async function oneTimeSecretGet (session, token) {
  const resp = await passWeaverAPI(session, METHOD.get, `/onetimetokens/${token}`)
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
