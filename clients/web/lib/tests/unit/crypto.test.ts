/**
 * @group core
 */

import { encryptAESGCM, encryptChunkedAESGCM, decryptAESGCM } from '../../src/utils/crypto-utils'

describe('Crypto', () => {
    test('should encrypt and decrypt with AES-GCM', async () => {
        const data = window.crypto.getRandomValues(new Uint8Array(50000))
        const info = await encryptAESGCM(data, 1024)

        expect(info.chunks).toBeInstanceOf(Array)
        expect(info.chunks.length).toBeGreaterThan(0)
        expect(info.secretKey).toHaveLength(32)

        // Assert that IV and secretKey are not all zeros
        expect(info.secretKey.reduce((a, b) => a + b, 0)).not.toEqual(0)

        info.chunks.forEach((chunk) => {
            expect(chunk.ciphertext).toBeInstanceOf(Uint8Array)
            expect(chunk.iv).toHaveLength(12)
            expect(chunk.ciphertext.length).toBeLessThanOrEqual(1024)
            expect(chunk.iv.reduce((a, b) => a + b, 0)).not.toEqual(0)
        })

        // Merge ciphertext of all chunks
        const mergedCiphertextLength = info.chunks.reduce(
            (acc, chunk) => acc + chunk.ciphertext.length,
            0,
        )
        const mergedCiphertext = new Uint8Array(mergedCiphertextLength)

        let offset = 0
        info.chunks.forEach((chunk) => {
            mergedCiphertext.set(chunk.ciphertext, offset)
            offset += chunk.ciphertext.length
        })

        // Decrypt once using the IV from the first chunk
        const decryptedData = await decryptAESGCM({
            ciphertext: mergedCiphertext,
            secretKey: info.secretKey,
            iv: info.chunks[0].iv, // Use the IV from the first chunk since they are all the same
        })

        // Verify that decryption is correct
        expect(decryptedData).toEqual(data)
    })

    test('should encrypt and decrypt using chunked AES-GCM', async () => {
        const data = window.crypto.getRandomValues(new Uint8Array(50000))
        const chunkSize = 1024
        const info = await encryptChunkedAESGCM(data, chunkSize)

        expect(info.chunks).toBeInstanceOf(Array)
        expect(info.chunks.length).toBeGreaterThan(0)
        expect(info.secretKey).toHaveLength(32)

        // Assert that IV and secretKey are not all zeros
        expect(info.secretKey.reduce((a, b) => a + b, 0)).not.toEqual(0)

        info.chunks.forEach((chunk) => {
            expect(chunk.ciphertext).toBeInstanceOf(Uint8Array)
            expect(chunk.iv).toHaveLength(12)
            expect(chunk.ciphertext.length).toBeLessThanOrEqual(chunkSize)
            expect(chunk.iv.reduce((a, b) => a + b, 0)).not.toEqual(0)
        })

        // Decrypt and verify correctness
        let decryptedData = new Uint8Array()
        for (let i = 0; i < info.chunks.length; i++) {
            const chunk = info.chunks[i]
            const decryptedChunk = await decryptAESGCM({
                ciphertext: chunk.ciphertext,
                secretKey: info.secretKey,
                iv: chunk.iv,
            })
            const newData = new Uint8Array(decryptedData.length + decryptedChunk.length)
            newData.set(decryptedData)
            newData.set(decryptedChunk, decryptedData.length)
            decryptedData = newData
        }
        expect(decryptedData).toEqual(data)
    })

    test('should fail on undefined and empty data', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
        await expect(encryptAESGCM(undefined as any, 1024)).rejects.toThrow(
            'Cannot encrypt undefined or empty data',
        )

        const emptyData = new Uint8Array()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await expect(encryptAESGCM(emptyData, 1024)).toReject()
    })
})
