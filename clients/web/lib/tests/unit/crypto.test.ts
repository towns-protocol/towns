/**
 * @group casablanca
 */

import crypto from 'crypto'
import { encryptAESGCM, decryptAESGCM } from '../../src/utils/crypto-utils'

describe('Crypto', () => {
    beforeAll(() => {
        Object.defineProperty(global.self, 'crypto', {
            value: {
                subtle: crypto.webcrypto.subtle,
                getRandomValues: crypto.getRandomValues,
            },
        })
    })

    test('should encrypt and decrypt', async () => {
        const data = window.crypto.getRandomValues(new Uint8Array(50000))
        const info = await encryptAESGCM(data)
        expect(info.iv).toHaveLength(12)
        expect(info.secretKey).toHaveLength(32)
        expect(info.ciphertext).not.toEqual(data)

        // assert that IV and secretKey are not all zeros
        expect(info.iv.reduce((a, b) => a + b, 0)).not.toEqual(0)
        expect(info.secretKey.reduce((a, b) => a + b, 0)).not.toEqual(0)

        const decrypted = await decryptAESGCM(info.ciphertext, info.iv, info.secretKey)
        expect(decrypted).toEqual(data)
    })

    test('should fail on undefined and empty data', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
        await expect(encryptAESGCM(undefined as any)).toReject()

        const emptyData = new Uint8Array()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await expect(encryptAESGCM(emptyData)).toReject()
    })
})
