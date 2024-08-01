/**
 * @group main
 */

import crypto from 'crypto'
import { deriveKeyAndIV } from './crypto_utils'

describe('crypto_utils', () => {
    test('derivedKeyAndIV', async () => {
        const spaceId = generateRandomSpaceId()

        const { key: key1, iv: iv1 } = await deriveKeyAndIV(spaceId)
        const { key: key2, iv: iv2 } = await deriveKeyAndIV(spaceId)

        // expect the same key and iv to be derived from the same spaceId
        expect(key1.toString()).toEqual(key2.toString())
        expect(iv1.toString()).toEqual(iv2.toString())
    })
})

function generateRandomSpaceId(): string {
    // Generate a random 32-byte buffer
    const buffer = crypto.randomBytes(40)

    // Convert the buffer to a hexadecimal string and prefix with '0x'
    return '0x' + buffer.toString('hex')
}
