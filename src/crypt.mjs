/**
 * Crypto module
 * @module crypt
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as crypto from 'crypto'

/**
 * Creates a random token
 * @returns {string} Returns a random token
 */
export function createKey () {
  return crypto.randomBytes(32).toString('base64')
}

/**
 * Encrypts data using AES-256-CBC
 * @param {string} data - The data to encrypt
 * @param {string} key - The encryption key (32 bytes)
 * @returns {string} - The encrypted data in base64 format
 */
export function encryptData (data, key) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv)
  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  return `${iv.toString('base64')}:${encrypted}`
}

/**
 * Decrypts data block using AES-CBC
 * @param {string} data The encrypted data in base64 format
 * @param {string} key The decryption key in base64 format (32 bytes)
 */
export function decryptBlock (data, key) {
  const parts = data.split(':')

  const iv = Buffer.from(parts[0], 'base64')
  const encryptedData = parts[1]

  const cipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(key, 'base64'),
    iv

  )

  let decrypted = cipher.update(encryptedData, 'base64', 'utf8')
  decrypted += cipher.final('utf8')

  return decrypted
}
