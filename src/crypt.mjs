/**
 * Crypto module
 * @module crypt
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import * as crypto from 'crypto'

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
