/**
 * Config module
 * @module src/config
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { readFile } from 'fs/promises'
import * as crypto from 'crypto'
import jsonschema from 'jsonschema'

// Config validation schema
const configSchema = {
  "id": "config",
  "type": "object",
  "properties": {
    "listen_port": { "type": "integer", "minimum": 1, "maximum": 65535 },
    "passweaverapi_url": { "type": "string" },
    "company_name": { "type": "string" },
    "log_dir": { "type": "string" },
    "https": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "certificate": { "type": "string" },
        "private_key": { "type": "string" },
        "hsts": { "type": "boolean" }
      },
      "required": [ "enabled" ]
    }
  },
  "required": ["listen_port", "passweaverapi_url", "company_name", "https", "log_dir"]
}

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

// Validate config against schema
const validate = jsonschema.validate(json, configSchema)
if ( !validate.valid ) {
  console.error("config.json is invalid, please verify the following:")
  console.error(validate.toString())
  process.exit(1)
}

// Create session and CSRF keys
console.log("Creating session and CSRF keys")
json.session_key = crypto.randomBytes(32).toString('hex')
json.csrf_key = crypto.randomBytes(32).toString('hex')

json.startuptime = (new Date()).toISOString()

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