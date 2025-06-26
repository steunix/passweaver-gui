/**
 * Creates a random token
 * @returns {string} Returns a random token
 */
export function createKey () {
  return window.crypto.randomUUID().substring(0, 32)
}

/**
 * Decrypts data block using AES-CBC
 * @param {string} data - The encrypted data in base64 format
 * @param {string} key - The decryption key (32 bytes)
 */
export async function decryptBlock (data, key) {
  const parts = data.split(':')

  const iv = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0))
  const encryptedData = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0))

  const algorithm = { name: 'AES-CBC', iv: iv }
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(key), algorithm, false, ['decrypt']
  )

  const decrypted = await window.crypto.subtle.decrypt(algorithm, cryptoKey, encryptedData)
  return new TextDecoder().decode(decrypted)
}
