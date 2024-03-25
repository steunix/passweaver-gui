/**
 * Config module
 * @module src/config
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { readFile } from 'fs/promises'
import * as crypto from 'crypto'

// Reads package.json
const packagejson = JSON.parse(
  await readFile(
    new URL('../package.json', import.meta.url)
  )
)

// Reads the configuration from file
var json
try {
  json = JSON.parse(
    await readFile(
      new URL('../config.json', import.meta.url)
    )
  )
} catch (err) {
  console.error("config.json not found or invalid")
  process.exit(1)
}

// Retreives the master key from environment
console.log("Creating session and CSFR keys")
json.session_key = crypto.randomBytes(32).toString('hex')
json.csfr_key = crypto.randomBytes(32).toString('hex')

/**
 * Returns the configuration stored in config.json
 * @returns {Object} The configuration
 */
export function get() {
  return json
}

/**
 * Reads the package.json of the project
 * @returns {Object} Returns package.json content
 */
export function packageJson() {
  return packagejson
}