import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // For AES, this is always 16

export function encryptData(text: string, key: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptData(text: string, key: string): string {
  // Check if this is the new format (with IV separator)
  if (text.includes(':')) {
    // New format: IV:encrypted_data
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift()!, 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } else {
    // Legacy format - try to decrypt with createDecipher (if available)
    // For backwards compatibility, we'll implement a fallback
    try {
      // This is a fallback for old data - note: createDecipher is deprecated
      // In production, you should migrate all old data to new format
      throw new Error('Legacy format detected - please re-encrypt your data')
    } catch {
      throw new Error('Cannot decrypt legacy format. Please re-authenticate to generate new keys.')
    }
  }
}