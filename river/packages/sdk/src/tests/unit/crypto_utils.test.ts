/**
 * @group main
 */

import crypto from 'crypto'
import { deriveKeyAndIV, encryptAESGCM } from '../../crypto_utils'

describe('crypto_utils', () => {
    test('derivedKeyAndIV', async () => {
        const spaceId = generateRandomSpaceId()

        const { key: key1, iv: iv1 } = await deriveKeyAndIV(spaceId)
        const { key: key2, iv: iv2 } = await deriveKeyAndIV(spaceId)

        // expect the same key and iv to be derived from the same spaceId
        expect(key1.toString()).toEqual(key2.toString())
        expect(iv1.toString()).toEqual(iv2.toString())
    })

    test('aesGcmEncryption', async () => {
        const keyPhrase = '0xaabbccddeeff00112233445566778899'
        const { key, iv } = await deriveKeyAndIV(keyPhrase)

        const plaintext = new Uint8Array([
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        ])

        const { ciphertext } = await encryptAESGCM(plaintext, key, iv)
        expect(ciphertext).toEqual(
            new Uint8Array([
                241, 174, 242, 10, 73, 18, 35, 179, 216, 45, 231, 145, 130, 224, 207, 196, 199, 179,
                167, 153, 119, 212, 159, 228, 232, 30, 108, 251, 1, 165, 140, 231, 68, 57, 22, 5,
                121,
            ]),
        )
    })
})

function generateRandomSpaceId(): string {
    // Generate a random 32-byte buffer
    const buffer = crypto.randomBytes(40)

    // Convert the buffer to a hexadecimal string and prefix with '0x'
    return '0x' + buffer.toString('hex')
}
