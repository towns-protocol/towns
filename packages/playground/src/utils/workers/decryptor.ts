import workerpool from 'workerpool'
import { createDecryptor } from '@towns-protocol/sdk/src/decryption/createDecryptor'

// Create a decryptor instance for this worker
// NOTE: This only supports AES-GCM (HybridGroupEncryption)
// Olm decryption will throw an error and should be handled by the fallback
const decryptor = createDecryptor({ maxCacheSize: 100 })

// Register the decryptor methods with workerpool
workerpool.worker({
    decryptGroupEvent: decryptor.decryptGroupEvent.bind(decryptor),
    hasSessionKey: decryptor.hasSessionKey.bind(decryptor),
    importSessionKeys: decryptor.importSessionKeys.bind(decryptor),
})