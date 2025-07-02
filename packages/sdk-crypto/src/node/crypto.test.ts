import { describe, test, expect } from 'vitest'
import { EncryptedDataSchema } from '@towns-protocol/proto'
import { AES_GCM_DERIVED_ALGORITHM } from '@towns-protocol/encryption'
import {
    uint8ArrayToBase64,
    base64ToUint8Array,
    deriveKeyAndIV,
    encryptAESGCM,
    decryptAESGCM,
    decryptDerivedAESGCM,
} from './index'
import { create } from '@bufbuild/protobuf'

const testData = new TextEncoder().encode('Hello, World! This is a test message.')
const testString = 'Hello, World!'
const testBase64 = 'SGVsbG8sIFdvcmxkIQ=='
const testKeyPhrase = 'test-passphrase-123'

describe('Crypto Functions', () => {
    test('should be running in a Node environment', () => {
        expect(typeof window === 'undefined').toBe(true)
    })

    describe('Base64 Conversion', () => {
        test('uint8ArrayToBase64 should convert Uint8Array to base64', () => {
            const uint8Array = new TextEncoder().encode(testString)
            const result = uint8ArrayToBase64(uint8Array)
            expect(result).toBe(testBase64)
        })

        test('base64ToUint8Array should convert base64 to Uint8Array', () => {
            const result = base64ToUint8Array(testBase64)
            const decoded = new TextDecoder().decode(result)
            expect(decoded).toBe(testString)
        })

        test('round-trip conversion should preserve data', () => {
            const original = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128])
            const base64 = uint8ArrayToBase64(original)
            const restored = base64ToUint8Array(base64)
            expect(restored).toEqual(original)
        })

        test('should handle empty arrays', () => {
            const empty = new Uint8Array(0)
            const base64 = uint8ArrayToBase64(empty)
            const restored = base64ToUint8Array(base64)
            expect(restored).toEqual(empty)
        })
    })

    describe('Key Derivation', () => {
        test('deriveKeyAndIV should derive consistent key and IV from string', async () => {
            const result1 = await deriveKeyAndIV(testKeyPhrase)
            const result2 = await deriveKeyAndIV(testKeyPhrase)

            expect(result1.key).toEqual(result2.key)
            expect(result1.iv).toEqual(result2.iv)
            expect(result1.key.length).toBe(32) // AES-256 key
            expect(result1.iv.length).toBe(12) // AES-GCM IV
        })

        test('deriveKeyAndIV should derive from Uint8Array', async () => {
            const keyBuffer = new TextEncoder().encode(testKeyPhrase)
            const result1 = await deriveKeyAndIV(keyBuffer)
            const result2 = await deriveKeyAndIV(testKeyPhrase)

            expect(result1.key).toEqual(result2.key)
            expect(result1.iv).toEqual(result2.iv)
        })

        test('different key phrases should produce different keys', async () => {
            const result1 = await deriveKeyAndIV('password1')
            const result2 = await deriveKeyAndIV('password2')

            expect(result1.key).not.toEqual(result2.key)
            expect(result1.iv).not.toEqual(result2.iv)
        })
    })

    describe('AES-GCM Encryption', () => {
        test('encryptAESGCM should encrypt data with generated key and IV', async () => {
            const result = await encryptAESGCM(testData)

            expect(result.ciphertext).toBeDefined()
            expect(result.iv).toBeDefined()
            expect(result.secretKey).toBeDefined()
            expect(result.secretKey.length).toBe(32)
            expect(result.iv.length).toBe(12)
            expect(result.ciphertext).not.toEqual(testData)
        })

        test('encryptAESGCM should use provided key and IV', async () => {
            const key = new Uint8Array(32).fill(1)
            const iv = new Uint8Array(12).fill(2)

            const result = await encryptAESGCM(testData, key, iv)

            expect(result.secretKey).toEqual(key)
            expect(result.iv).toEqual(iv)
        })

        test('encryptAESGCM should throw on empty data', async () => {
            await expect(encryptAESGCM(new Uint8Array(0))).rejects.toThrow(
                'Cannot encrypt undefined or empty data',
            )
        })

        test('encryptAESGCM should throw on invalid key length', async () => {
            const shortKey = new Uint8Array(16) // Too short
            await expect(encryptAESGCM(testData, shortKey)).rejects.toThrow('Invalid key length')
        })

        test('encryptAESGCM should throw on invalid IV length', async () => {
            const key = new Uint8Array(32)
            const shortIV = new Uint8Array(8) // Too short
            await expect(encryptAESGCM(testData, key, shortIV)).rejects.toThrow('Invalid IV length')
        })
    })

    describe('AES-GCM Decryption', () => {
        test('decryptAESGCM should decrypt encrypted data', async () => {
            const { ciphertext, iv, secretKey } = await encryptAESGCM(testData)
            const decrypted = await decryptAESGCM(ciphertext, secretKey, iv)

            expect(decrypted).toEqual(testData)
        })

        test('decryptAESGCM should decrypt base64 encoded data', async () => {
            const { ciphertext, iv, secretKey } = await encryptAESGCM(testData)
            const base64Ciphertext = uint8ArrayToBase64(ciphertext)
            const decrypted = await decryptAESGCM(base64Ciphertext, secretKey, iv)

            expect(decrypted).toEqual(testData)
        })

        test('decryptAESGCM should throw on invalid key length', async () => {
            const { ciphertext, iv } = await encryptAESGCM(testData)
            const shortKey = new Uint8Array(16)

            await expect(decryptAESGCM(ciphertext, shortKey, iv)).rejects.toThrow(
                'Invalid key length',
            )
        })

        test('decryptAESGCM should throw on invalid IV length', async () => {
            const { ciphertext, secretKey } = await encryptAESGCM(testData)
            const shortIV = new Uint8Array(8)

            await expect(decryptAESGCM(ciphertext, secretKey, shortIV)).rejects.toThrow(
                'Invalid IV length',
            )
        })

        test('decryptAESGCM should throw on tampered ciphertext', async () => {
            const { ciphertext, iv, secretKey } = await encryptAESGCM(testData)
            const tamperedCiphertext = new Uint8Array(ciphertext)
            tamperedCiphertext[0] = tamperedCiphertext[0] ^ 1 // Flip a bit

            await expect(decryptAESGCM(tamperedCiphertext, secretKey, iv)).rejects.toThrow()
        })
    })

    describe('Derived Key Decryption', () => {
        test('decryptDerivedAESGCM should decrypt with key phrase', async () => {
            const { key, iv } = await deriveKeyAndIV(testKeyPhrase)
            const { ciphertext } = await encryptAESGCM(testData, key, iv)

            const encryptedData = create(EncryptedDataSchema, {
                algorithm: AES_GCM_DERIVED_ALGORITHM,
                ciphertext: uint8ArrayToBase64(ciphertext),
            })

            const decrypted = await decryptDerivedAESGCM(testKeyPhrase, encryptedData)
            expect(decrypted).toEqual(testData)
        })

        test('decryptDerivedAESGCM should throw on unsupported algorithm', async () => {
            const encryptedData = create(EncryptedDataSchema, {
                algorithm: 'unsupported-algorithm',
                ciphertext: 'dummy-data',
            })

            await expect(decryptDerivedAESGCM(testKeyPhrase, encryptedData)).rejects.toThrow(
                'algorithm not implemented',
            )
        })
    })

    describe('End-to-End Encryption Flow', () => {
        test('full encryption/decryption cycle should preserve data', async () => {
            const originalData = new TextEncoder().encode(
                'This is a comprehensive test message with various characters: !@#$%^&*()_+{}[]|:;<>?,./`~',
            )
            const { ciphertext, iv, secretKey } = await encryptAESGCM(originalData)
            const decrypted = await decryptAESGCM(ciphertext, secretKey, iv)

            expect(decrypted).toEqual(originalData)
            expect(new TextDecoder().decode(decrypted)).toBe(new TextDecoder().decode(originalData))
        })

        test('derived key encryption/decryption cycle should preserve data', async () => {
            const originalData = new TextEncoder().encode('Test message for derived key encryption')
            const keyPhrase = 'my-secret-passphrase-12345'

            const { key, iv } = await deriveKeyAndIV(keyPhrase)
            const { ciphertext } = await encryptAESGCM(originalData, key, iv)

            const encryptedData = create(EncryptedDataSchema, {
                algorithm: AES_GCM_DERIVED_ALGORITHM,
                ciphertext: uint8ArrayToBase64(ciphertext),
            })

            const decrypted = await decryptDerivedAESGCM(keyPhrase, encryptedData)
            expect(decrypted).toEqual(originalData)
        })
    })

    describe('Edge Cases', () => {
        test('should handle large data', async () => {
            const largeData = new Uint8Array(1024 * 100) // 100KB
            largeData.fill(42)

            const { ciphertext, iv, secretKey } = await encryptAESGCM(largeData)
            const decrypted = await decryptAESGCM(ciphertext, secretKey, iv)

            expect(decrypted).toEqual(largeData)
        })

        test('should handle binary data with all byte values', async () => {
            const binaryData = new Uint8Array(256)
            for (let i = 0; i < 256; i++) {
                binaryData[i] = i
            }

            const { ciphertext, iv, secretKey } = await encryptAESGCM(binaryData)
            const decrypted = await decryptAESGCM(ciphertext, secretKey, iv)

            expect(decrypted).toEqual(binaryData)
        })

        test('should handle unicode strings in key phrases', async () => {
            const unicodeKeyPhrase = '测试密码🔐🚀'
            const { key, iv } = await deriveKeyAndIV(unicodeKeyPhrase)

            expect(key.length).toBe(32)
            expect(iv.length).toBe(12)

            // Should be deterministic
            const { key: key2, iv: iv2 } = await deriveKeyAndIV(unicodeKeyPhrase)
            expect(key).toEqual(key2)
            expect(iv).toEqual(iv2)
        })
    })
})
