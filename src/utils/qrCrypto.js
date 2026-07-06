import CryptoJS from 'crypto-js'

const SECRET = import.meta.env.VITE_QR_SECRET_KEY || 'dev-only-key'

// Encrypts a college's identity payload before it goes into the QR.
// payload: { collegeId, collegeName, department, securityToken }
export function encryptCollegePayload(payload) {
  const json = JSON.stringify(payload)
  return CryptoJS.AES.encrypt(json, SECRET).toString()
}

// Decrypts a scanned QR string back into the payload object.
// Returns null if the ciphertext is invalid/tampered — callers must
// treat null as "reject the scan", never fall back to trusting it.
export function decryptCollegePayload(ciphertext) {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET)
    const json = bytes.toString(CryptoJS.enc.Utf8)
    if (!json) return null
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Generates a random security token to embed per-college, so the QR
// payload can't be recreated just by knowing the college name.
export function generateSecurityToken() {
  return CryptoJS.lib.WordArray.random(16).toString()
}
