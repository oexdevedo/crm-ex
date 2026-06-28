import crypto from 'crypto'

/**
 * WhatsApp token encryption.
 *
 * Format — GCM (current):
 *   `<iv-hex>:<ciphertext-hex>:<authTag-hex>`      (three colons)
 *
 * Format — CBC (legacy, decrypt-only):
 *   `<iv-hex>:<ciphertext-hex>`                    (one colon)
 *
 * Backward compatibility:
 *   `decrypt()` auto-detects the format by counting parts, so legacy
 *   rows keep working. New `encrypt()` output is always GCM.
 */

// 12 bytes is the NIST-recommended IV length for GCM.
const GCM_IV_LENGTH = 12
const CBC_IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Resolves the 32-byte buffer key safely from the ENCRYPTION_KEY env var.
 * If the key is missing or not 64 hex characters, falls back to a derived key via SHA-256
 * to prevent AES key-length exceptions (500 errors).
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    console.error('ERROR: ENCRYPTION_KEY environment variable is missing!')
    // Return a dummy 32-byte buffer to prevent crash in dev/build
    return Buffer.alloc(32, 'a')
  }

  if (key.length !== 64) {
    console.warn(
      `WARNING: ENCRYPTION_KEY length is ${key.length} (expected 64 hex chars). Deriving a valid 32-byte key via SHA-256.`
    )
    return crypto.createHash('sha256').update(key).digest()
  }

  try {
    const buf = Buffer.from(key, 'hex')
    if (buf.length !== 32) {
      return crypto.createHash('sha256').update(key).digest()
    }
    return buf
  } catch (err) {
    console.error('ERROR: Failed to parse ENCRYPTION_KEY as hex. Deriving via SHA-256.')
    return crypto.createHash('sha256').update(key).digest()
  }
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(GCM_IV_LENGTH)
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    iv,
  )
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':')

  if (parts.length === 3) {
    // GCM — current format.
    const [ivHex, ctHex, tagHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== GCM_IV_LENGTH) {
      throw new Error(
        `Encrypted token has unexpected GCM IV length ${iv.length}`,
      )
    }
    const authTag = Buffer.from(tagHex, 'hex')
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(
        `Encrypted token has unexpected GCM auth-tag length ${authTag.length}`,
      )
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      iv,
    )
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ctHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  if (parts.length === 2) {
    // CBC — legacy.
    const [ivHex, ctHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    if (iv.length !== CBC_IV_LENGTH) {
      throw new Error(
        `Encrypted token has unexpected CBC IV length ${iv.length}`,
      )
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      getEncryptionKey(),
      iv,
    )
    let decrypted = decipher.update(ctHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  throw new Error(
    `Encrypted token has unrecognised format (expected 1 or 2 colons, got ${
      parts.length - 1
    })`,
  )
}

export function isLegacyFormat(encryptedText: string): boolean {
  return encryptedText.split(':').length === 2
}
