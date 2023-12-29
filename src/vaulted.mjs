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
export async function tree(session) {
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
 * Get permissions for folder
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