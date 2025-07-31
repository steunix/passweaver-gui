/**
 * Creates a random token
 * @returns {string} Returns a random token
 */
export function createKey () {
  const randomBytes = new Uint8Array(32)
  window.crypto.getRandomValues(randomBytes)
  return btoa(String.fromCharCode(...randomBytes))
}

/**
 * Decrypts data block using AES-CBC
 * @param {string} data - The encrypted data in base64 format
 * @param {string} key - The decryption key in base64 format (32 bytes)
 */
export async function decryptBlock (data, key) {
  const parts = data.split(':')

  const iv = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0))
  const encryptedData = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0))

  // Convert base64 key to Uint8Array
  const keyBytes = Uint8Array.from(atob(key), c => c.charCodeAt(0))

  const algorithm = { name: 'AES-CBC', iv }
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw', keyBytes, algorithm, false, ['decrypt']
  )

  const decrypted = await window.crypto.subtle.decrypt(algorithm, cryptoKey, encryptedData)
  return new TextDecoder().decode(decrypted)
}
