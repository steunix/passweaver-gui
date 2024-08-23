/**
 * PassWeaver API module
 * @module src/passweaver
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import Got from 'got'
import * as Config from './config.mjs'

const cfg = Config.get()

/**
 * Call PassWeaver API
 * @param {Object} session Current session
 * @param {string} method HTTP method
 * @param {string} path API path
 * @param {Object} data data for POST operations
 * @returns
 */
async function passWeaverAPI(session, method, path, data) {
  try {
    let options = {
      retry: {
        limit: 0
      },
      timeout: {
        response: 50000
      },
      headers: {
        'user-agent': 'got'
      },
      json: data,
      method: method
    }
    if ( session && session.jwt ) {
      options.headers['Authorization'] = `Bearer ${session.jwt}`
    }
    var resp = await Got(cfg.passweaverapi_url+path, options)

    var ret = JSON.parse(resp.body)
    ret.fatal = false
    ret.httpStatusCode = resp.statusCode

    return ret
  } catch (err) {
    // PassWeaver API not running
    if ( err.code==="ECONNREFUSED" || err.code==="ETIMEDOUT" ) {
      return {
        httpStatusCode: undefined,
        fatal: true,
        status: "failed",
        message: "Error connecting to PassWeaver API, contact your administrator.",
        data: {}
      }
    }
    // Error in API
    if ( err.response && err.response.statusCode=="500" ) {
      return {
        httpStatusCode: err.response.statusCode,
        fatal: false,
        status: "failed",
        message: "Bad request to PassWeaver API.",
        data: {}
      }
    }

    // Error 401 may be expired token or bad personal password
    if ( err.response && err.response.statusCode=="401" ) {
      var msg = JSON.parse(err.response.body).message

      if ( msg=="Unauthorized" ) {
        return {
          httpStatusCode: err.response.statusCode,
          fatal: false,
          status: "failed",
          message: "Invalid password",
          data: {}
        }
      }

      // Invalid token (we already have a session, but jwt token is not valid)
      if ( session && session.jwt && msg=="Invalid token" ) {
        return {
          httpStatusCode: err.response.statusCode,
          fatal: true,
          status: "failed",
          message: "Invalid token, you need to login",
          data: {}
        }
      }

      // Token expired (we already have a session, but jwt token is expired)
      if ( session && session.jwt && msg=="Token expired" ) {
        return {
          httpStatusCode: err.response.statusCode,
          fatal: true,
          status: "failed",
          message: "Session token expired",
          data: {}
        }
      }
    }

    // Other response (404, 422, et al) or generic error
    return {
      httpStatusCode: err?.response?.statusCode,
      fatal: false,
      status: "failed",
      message: err?.response?.body ? JSON.parse(err.response.body).message : "Unknown error",
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
export async function login(username, password) {
  const resp = await passWeaverAPI(null, "post", "/login", {
    username: username,
    password: password
  })
  return resp
}

/**
 * Get user info
 * @param {Object} session Current session
 * @param {string} id User id
 * @returns
 */
export async function getUser(session, id) {
  const resp = await passWeaverAPI(session, "get", `/users/${id}`)

  return resp
}

/**
 * Get folders tree for current user
 * @param {Object} session Current session
 * @returns
 */
export async function foldersTree(session) {
  const resp = await passWeaverAPI(session, "get", `/folders/tree`)
  return resp
}

/**
 * Get items list for folder
 * @param {Object} session Current session
 * @param {string} folder Folder id
 * @param {string} search Item title search
 * @returns
 */
export async function itemsList(session, folder, search, type) {
  const resp = await passWeaverAPI(session, "get",
    `/folders/${folder}/items?search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}`)
  return resp
}

/**
 * Search items in any folder
 * @param {Object} session Current session
 * @param {string} search Item title search
 * @returns
 */
export async function itemsSearch(session, search, type) {
  const resp = await passWeaverAPI(session, "get", `/items?search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}`)
  return resp
}

/**
 * Get folder details
 * @param {Object} session Current session
 * @param {string} folder Folder id
 * @returns
 */
export async function getFolder(session, folder) {
  const resp = await passWeaverAPI(session, "get", `/folders/${folder}`)
  return resp
}

/**
 * Create a new item
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function itemCreate(session, folder, body) {
  const item = {
    title: body.title,
    type: body.type,
    metadata: body.user,
    data: JSON.stringify({
      description: body.description,
      email: body.email,
      url: body.url,
      user: body.user,
      password: body.password
    })
  }

  const resp = await passWeaverAPI(session, "post", `/folders/${folder}/items`, item)
  return resp
}

/**
 * Clone an item
 * @param {Object} session
 * @param {string} item
 * @returns
 */
export async function itemClone(session, item) {
  const resp = await passWeaverAPI(session, "post", `/items/${item}/clone`)
  return resp
}

/**
 * Delete an item
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function itemRemove(session, item) {
  const resp = await passWeaverAPI(session, "delete", `/items/${item}`)
  return resp
}

/**
 * Get an item
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function itemGet(session, item) {
  const resp = await passWeaverAPI(session, "get", `/items/${item}`)
  return resp
}

/**
 * Update an item
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function itemUpdate(session, itemid, body) {
  const data = JSON.stringify({
    description: body.data.description,
    email: body.data.email,
    url: body.data.url,
    user: body.data.user,
    password: body.data.password
  })

  const item = {
    title: body.title,
    type: body.type,
    data: data,
    metadata: body.data.user
  }

  const resp = await passWeaverAPI(session, "patch", `/items/${itemid}`, item)
  return resp
}

/**
 * Move an item into another folder
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function itemMove(session, itemid, body) {
  const item = {
    folder: body.folder
  }

  const resp = await passWeaverAPI(session, "patch", `/items/${itemid}`, item)
  return resp
}

/**
 * Create a new folder
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function folderCreate(session, folder, body) {
  const data = {
    description: body.description
  }

  const resp = await passWeaverAPI(session, "post", `/folders/${folder}/folders`, data)
  return resp
}

/**
 * Delete a folder
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function folderRemove(session, folder) {
  const resp = await passWeaverAPI(session, "delete", `/folders/${folder}`)
  return resp
}

/**
 * Update a folder
 * @param {Object} session
 * @param {string} folder
 * @param {Object} body
 * @returns
 */
export async function folderUpdate(session, folder, body) {
  var data = {}
  if ( body?.description ) {
    data.description = body.description
  }
  if ( body?.parent ) {
    data.parent = body.parent
  }

  const resp = await passWeaverAPI(session, "patch", `/folders/${folder}`, data)
  return resp
}

/**
 * Get groups tree
 * @param {Object} session Current session
 * @returns
 */
export async function groupsTree(session) {
  const resp = await passWeaverAPI(session, "get", "/groups/tree")
  return resp
}

/**
 * Users list
 * @param {Object} session Current session
 * @param {string} group Group id
 * @returns
 */
export async function usersList(session, group, search) {
  var resp, url
  if ( group ) {
    url = `/groups/${group}/users`
  } else {
    url = `/users`
  }

  if ( search ) {
    url += `/?search=${search}`
  }
  resp = await passWeaverAPI(session, "get", url)
  return resp
}

/**
 * Create a new group
 * @param {Object} session
 * @param {string} group
 * @param {Object} body
 * @returns
 */
export async function groupCreate(session, group, body) {
  const data = {
    description: body.description
  }

  const resp = await passWeaverAPI(session, "post", `/groups/${group}/groups`, data)
  return resp
}

/**
 * Get group details
 * @param {Object} session Current session
 * @param {string} group Group id
 * @returns
 */
export async function getGroup(session, group) {
  const resp = await passWeaverAPI(session, "get", `/groups/${group}`  )
  return resp
}

/**
 * Update a group
 * @param {Object} session
 * @param {string} group
 * @param {Object} body
 * @returns
 */
export async function groupUpdate(session, group, body) {
  var data = {}
  if ( body?.description ) {
    data.description = body.description
  }
  if ( body?.parent ) {
    data.parent = body.parent
  }

  const resp = await passWeaverAPI(session, "patch", `/groups/${group}`, data)
  return resp
}

/**
 * Delete a group
 * @param {Object} session
 * @param {string} group
 * @param {Object} body
 * @returns
 */
export async function groupRemove(session, group) {
  const resp = await passWeaverAPI(session, "delete", `/groups/${group}`)
  return resp
}

/**
 * Add a user to group
 * @param {*} session
 * @param {*} group
 * @param {*} user
 */
export async function groupAddUser(session, group, user) {
  const resp = await passWeaverAPI(session, "post", `/groups/${group}/users/${user}`)
  return resp
}

/**
 * Delete user from group
 * @param {*} session
 * @param {*} group
 * @param {*} user
 */
export async function groupRemoveUser(session, group, user) {
  const resp = await passWeaverAPI(session, "delete", `/groups/${group}/users/${user}`)
  return resp
}

/**
 * Create a user
 * @param {Object} session Session object
 * @param {Object} userData User data
 * @returns
 */
export async function userCreate(session, userData) {
  const resp = await passWeaverAPI(session, "post", `/users/`, userData)
  return resp
}

/**
 * Get a user
 * @param {Object} session
 * @param {Object} user
 * @returns
 */
export async function userGet(session, user) {
  const resp = await passWeaverAPI(session, "get", `/users/${user}`)
  return resp
}

/**
 * Update a user
 * @param {Object} session
 * @param {string} user
 * @param {Object} body
 * @returns
 */
export async function userUpdate(session, user, body) {
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

  const resp = await passWeaverAPI(session, "patch", `/users/${user}`, data)
  return resp
}

/**
 * Get folder groups
 * @param {Object} session
 * @param {string} folder
 */
export async function folderGroups(session, folder) {
  const resp = await passWeaverAPI(session, "get", `/folders/${folder}/groups`)
  return resp
}

/**
 * Get user groups
 * @param {Object} session Session object
 * @param {string} user User ID
 */
export async function userGroups(session, user) {
  const resp = await passWeaverAPI(session, "get", `/users/${user}/groups`)
  return resp
}

/**
 * Add a group to a folder
 * @param {Object} session Session object
 * @param {string} folder Folder
 * @param {string} group Group to add
 * @returns
 */
export async function folderAddGroup(session, folder, group) {
  const data = {
    read: true,
    write: false
  }

  const resp = await passWeaverAPI(session, "post", `/folders/${folder}/groups/${group}`, data)
  return resp
}

/**
 * Remove a group from folder
 * @param {Object} session Session object
 * @param {string} folder Folder
 * @param {string} group Group to remove
 * @returns
 */
export async function folderRemoveGroup(session, folder, group) {
  const resp = await passWeaverAPI(session, "delete", `/folders/${folder}/groups/${group}`)
  return resp
}

/**
 * Toggle group permissions on folder
 * @param {Object} session Session object
 * @param {string} folder Folder
 * @param {string} group Group to remove
 * @returns
 */
export async function folderToggleGroup(session, folder, group) {
  const perm = await passWeaverAPI(session, "get", `/folders/${folder}/groups`)

  for ( const g of perm.data ) {
    if ( g.id==group ) {
      const resp = await passWeaverAPI(session, "patch", `/folders/${folder}/groups/${group}`, { read: true, write: !g.write})
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
export async function groupsList(session, search) {
  var resp
  var url = `/groups/`

  if ( search ) {
    url += `/?search=${search}`
  }
  resp = await passWeaverAPI(session, "get", url)
  return resp
}

/**
 * Delete an user
 * @param {Object} session Session object
 * @param {string} user User
 * @returns
 */
export async function userRemove(session, user) {
  const resp = await passWeaverAPI(session, "delete", `/users/${user}`)
  return resp
}

/**
 * Generate a password
 * @param {Object} session Session
 * @returns
 */
export async function generatePassword(session) {
  const resp = await passWeaverAPI(session, "get", "/util/generatepassword")
  return resp
}

/**
 * Create personal password
 * @param {Object} session Session
 * @param {string} passsword Password
 * @returns
 */
export async function personalPasswordCreate(session, password) {
  var resp = await passWeaverAPI(session, "post", "/personal/password", {
    password: password
  })

  // If successfull, unlock personal folder directly
  if ( resp.httpStatusCode=="200" ) {
    resp = await passWeaverAPI(session, "post", "/personal/unlock", {
      password: password
    })

    if ( resp.httpStatusCode=="200" ) {
      session.jwt = resp.data.jwt
    }
  }

  return resp
}

/**
 * Personal login
 * @param {Object} session Session
 * @param {string} passsword Password
 * @returns
 */
export async function personalUnlock(req, session, password) {
  const resp = await passWeaverAPI(session, "post", "/personal/unlock", {
    password: password
  })

  if ( resp.httpStatusCode=="200" ) {
    req.session.jwt = resp.data.jwt
  }

  return resp
}

/**
 * Add an event
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} event Event code
 * @param {string} entity Entity code
 * @param {string} entityid Entity id
 * @returns
 */
export async function addEvent(req, session, event, entity, entityid) {
  const data = {
    event: event,
    entity: entity,
    entityid: entityid
  }

  const resp = await passWeaverAPI(session, "post", "/events", data)
  return resp
}

/**
 * Item types list
 * @param {Object} req Request
 * @param {Object} session Session
 * @returns
 */
export async function itemTypesList(req, session) {

  const resp = await passWeaverAPI(session, "get", "/itemtypes")
  return resp
}

/**
 * New item type
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} description Description
 * @param {string} icon Icon
 * @returns
 */
export async function itemTypeCreate(req, session, description, icon) {
  const data = {
    description: description,
    icon: icon
  }

  const resp = await passWeaverAPI(session, "post", "/itemtypes", data)
  return resp
}

/**
 * Delete item type
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} id Item type id
 * @returns
 */
export async function itemTypeRemove(req, session, id) {
  const resp = await passWeaverAPI(session, "delete", `/itemtypes/${id}`)
  return resp
}

/**
 * Get item type
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} id Item type id
 * @returns
 */
export async function itemTypeGet(req, session, id) {
  const resp = await passWeaverAPI(session, "get", `/itemtypes/${id}`)
  return resp
}

/**
 * Edit item type
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} description Description
 * @param {string} icon Icon
 * @returns
 */
export async function itemTypeEdit(req, session, id, description, icon) {
  const data = {
    description: description,
    icon: icon
  }

  const resp = await passWeaverAPI(session, "patch", `/itemtypes/${id}`, data)
  return resp
}

/**
 * Info
 * @param {Object} session Session
 * @returns
 */
export async function info(session) {
  const resp = await passWeaverAPI(session, "get", "/util/info")
  return resp
}

/**
 * Get user preferences
 * @param {*} req
 * @param {*} session
 */
export async function preferencesGet(req, session) {
  const resp = await passWeaverAPI(session, "get", `/users/${session.user}/settings`)
  return resp
}

/**
 * Set user preferences
 * @param {*} req
 * @param {*} session
 */
export async function preferencesSet(req, session) {
  var prefs = [
    { setting: "theme", value: req.body.theme }
  ]

  const resp = await passWeaverAPI(session, "post", `/users/${session.user}/settings`, prefs)
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
export async function oneTimeSecretCreate(req, session, data) {
  const resp = await passWeaverAPI(session, "post", "/onetimetokens", {data: data, hours: Config.get().onetimetokens.default_hours})
  return resp
}

/**
 * Get one time secret
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} token Item type id
 */
export async function oneTimeSecretGet(req, session, token) {
  const resp = await passWeaverAPI(session, "get", `/onetimetokens/${token}`)
  return resp
}

/**
 * Change user password
 * @param {Object} req Request
 * @param {Object} session Session
 * @param {string} newpassword New password
 */
export async function passwordChange(req, session, newpassword) {
  const userData = {
    secret: newpassword
  }

  const resp = await passWeaverAPI(session, "patch", `/users/${session.user}`, userData)
  return resp
}