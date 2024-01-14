/**
 * Vaulted API module
 * @module src/vaulted
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import Got from 'got'
import * as Config from './config.mjs'

const cfg = Config.get()

/**
 * Call Vaulted API
 * @param {Object} session Current session
 * @param {string} method HTTP method
 * @param {string} path API path
 * @param {Object} data data for POST operations
 * @returns
 */
async function vaultedAPI(session, method, path, data) {
  try {
    let options = {
      retry: {
        limit: 0
      },
      json: data,
      method: method
    }
    if ( session && session.jwt ) {
      options.headers = { "Authorization": "Bearer "+session.jwt}
    }
    return await Got(cfg.vaulted_url+path, options).json()
  } catch (err) {
    // Vaulted API not running
    if ( err.code==="ECONNREFUSED") {
      return {
        status: "failed",
        message: "Error connecting to Vaulted API, contact your administrator.",
        data: {}
      }
    }
    // Bad error
    if ( err.response && err.response.statusCode=="500" ) {
      return {
        status: "failed",
        message: "Bad request to Vaulted API. Smells like a bug.",
        data: {}
      }
    }
    // Default response
    return err.response ? JSON.parse(err.response.body) : err
  }
}

/**
 * Login
 * @param {string} username User name
 * @param {string} password Password
 * @returns
 */
export async function login(username, password) {
  const resp = await vaultedAPI(null, "post", "/login", {
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
  const resp = await vaultedAPI(session, "get", "/users/"+id)

  return resp
}

/**
 * Get folders tree for current user
 * @param {Object} session Current session
 * @returns
 */
export async function foldersTree(session) {
  const resp = await vaultedAPI(session, "get", "/folders/util/tree")
  return resp
}

/**
 * Get items list for folder
 * @param {Object} session Current session
 * @param {string} folder Folder id
 * @returns
 */
export async function itemslist(session, folder) {
  const resp = await vaultedAPI(session, "get", "/folders/"+folder+"/items")
  return resp
}

/**
 * Get folder details
 * @param {Object} session Current session
 * @param {string} folder Folder id
 * @returns
 */
export async function getFolder(session, folder) {
  const resp = await vaultedAPI(session, "get", "/folders/"+folder)
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
    data: JSON.stringify({
      description: body.description,
      url: body.url,
      user: body.user,
      password: body.password
    })
  }

  const resp = await vaultedAPI(session, "post", "/folders/"+folder+"/items", item)
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
  const resp = await vaultedAPI(session, "delete", "/items/"+item)
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
  const resp = await vaultedAPI(session, "get", "/items/"+item)
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
  const item = {
    title: body.title,
    data: JSON.stringify({
      description: body.description,
      url: body.url,
      user: body.user,
      password: body.password
    })
  }

  const resp = await vaultedAPI(session, "patch", "/items/"+itemid, item)
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

  const resp = await vaultedAPI(session, "post", "/folders/"+folder+"/folders", data)
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
  const resp = await vaultedAPI(session, "delete", "/folders/"+folder)
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
  const data = {
    description: body.description
  }

  const resp = await vaultedAPI(session, "patch", "/folders/"+folder, data)
  return resp
}

/**
 * Get groups tree
 * @param {Object} session Current session
 * @returns
 */
export async function groupsTree(session) {
  const resp = await vaultedAPI(session, "get", "/groups/util/tree")
  return resp
}

/**
 * Users list
 * @param {Object} session Current session
 * @param {string} group Group id
 * @returns
 */
export async function usersList(session, group) {
  var resp
  if ( group ) {
    resp = await vaultedAPI(session, "get", "/groups/"+group+"/users")
  } else {
    resp = await vaultedAPI(session, "get", "/users")
  }
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

  const resp = await vaultedAPI(session, "post", "/groups/"+group+"/groups", data)
  return resp
}

/**
 * Get group details
 * @param {Object} session Current session
 * @param {string} group Group id
 * @returns
 */
export async function getGroup(session, group) {
  const resp = await vaultedAPI(session, "get", "/groups/"+group  )
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
  const data = {
    description: body.description
  }

  const resp = await vaultedAPI(session, "patch", "/groups/"+group, data)
  return resp
}

/**
 * Delete a group
 * @param {Object} session
 * @param {string} group
 * @param {Object} body
 * @returns
 */
export async function groupRemove(session, folder) {
  const resp = await vaultedAPI(session, "delete", "/groups/"+folder)
  return resp
}

/**
 * Create a user
 * @param {Object} session
 * @param {Object} user
 * @returns
 */
export async function userCreate(session, user) {
  const resp = await vaultedAPI(session, "post", "/users", user)
  return resp
}

/**
 * Get a user
 * @param {Object} session
 * @param {Object} user
 * @returns
 */
export async function userGet(session, user) {
  const resp = await vaultedAPI(session, "get", "/users/"+user)
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
    active: body.active=="true"
  }

  const resp = await vaultedAPI(session, "patch", "/users/"+user, data)
  return resp
}

/**
 * Delete an user
 * @param {Object} session
 * @param {string} user
 * @param {Object} body
 * @returns
 */
export async function userRemove(session, user) {
  const resp = await vaultedAPI(session, "delete", "/users/"+user)
  return resp
}

/**
 * Generate a password
 * @param {Object} session
 * @returns
 */
export async function generatePassword(session) {
  const resp = await vaultedAPI(session, "get", "/util/generatepassword")
  return resp
}