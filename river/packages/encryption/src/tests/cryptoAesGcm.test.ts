import {
    generateNewAesGcmKey,
    exportAesGsmKeyBytes,
    importAesGsmKeyBytes,
    encryptAesGcm,
    decryptAesGcm,
} from '../cryptoAesGcm'

it('cryptoAesGcm', async () => {
    const key = await generateNewAesGcmKey()
    expect(key).toBeDefined()

    const keyBytes = await exportAesGsmKeyBytes(key)
    expect(keyBytes).toBeDefined()
    expect(keyBytes.length).toBe(32)

    const key2 = await importAesGsmKeyBytes(keyBytes)
    expect(key2).toBeDefined()

    const data1 = Uint8Array.from([55])
    const data16 = Uint8Array.from([55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55])
    const data1000 = Uint8Array.from(Array(1000).fill(55))

    const encrypted1 = await encryptAesGcm(key, data1)
    const decrypted1 = await decryptAesGcm(key, encrypted1.ciphertext, encrypted1.iv)
    expect(decrypted1).toEqual(data1)

    const encrypted16 = await encryptAesGcm(key, data16)
    const decrypted16 = await decryptAesGcm(key, encrypted16.ciphertext, encrypted16.iv)
    expect(decrypted16).toEqual(data16)

    const encrypted1000 = await encryptAesGcm(key, data1000)
    const decrypted1000 = await decryptAesGcm(key, encrypted1000.ciphertext, encrypted1000.iv)
    expect(decrypted1000).toEqual(data1000)

    const encrypted1000a = await encryptAesGcm(key, data1000)
    expect(encrypted1000a).not.toEqual(encrypted1000) // IV should be different
    const decrypted1000a = await decryptAesGcm(key, encrypted1000a.ciphertext, encrypted1000a.iv)
    expect(decrypted1000a).toEqual(data1000)

    // Check key2 works for decrypting
    const decrypted1000c = await decryptAesGcm(key2, encrypted1000a.ciphertext, encrypted1000a.iv)
    expect(decrypted1000c).toEqual(data1000)

    // Check key2 works for encrypting, key works for decrypting
    const encrypted1000d = await encryptAesGcm(key2, data1000)
    const decrypted1000d = await decryptAesGcm(key, encrypted1000d.ciphertext, encrypted1000d.iv)
    expect(decrypted1000d).toEqual(data1000)

    // Check can't decrypt encrypted1 with added 0 at the end
    const encrypted1a = new Uint8Array(encrypted1.ciphertext.length + 1)
    encrypted1a.set(encrypted1.ciphertext)
    encrypted1a[encrypted1.ciphertext.length] = 0
    await expect(decryptAesGcm(key, encrypted1a, encrypted1.iv)).rejects.toThrow()

    // Check can't decrypt if encrypted1000 byte 0 is modified
    const encrypted1000b = new Uint8Array(encrypted1000.ciphertext)
    encrypted1000b[0] = (encrypted1000b[0] + 1) % 256
    await expect(decryptAesGcm(key, encrypted1000b, encrypted1000.iv)).rejects.toThrow()

    // Check can't decrypt if encrypted1000 byte 500 is modified
    const encrypted1000c = new Uint8Array(encrypted1000.ciphertext)
    encrypted1000c[500] = (encrypted1000c[500] + 1) % 256
    await expect(decryptAesGcm(key, encrypted1000c, encrypted1000.iv)).rejects.toThrow()

    // Check can't decrypt if IV is modified
    const modifiedIv = new Uint8Array(encrypted1000.iv)
    modifiedIv[0] = (modifiedIv[0] + 1) % 256
    await expect(decryptAesGcm(key, encrypted1000.ciphertext, modifiedIv)).rejects.toThrow()

    // Check can't import key of wrong length
    const badKey0 = new Uint8Array(0)
    await expect(importAesGsmKeyBytes(badKey0)).rejects.toThrow()
    const badKey1 = Uint8Array.from(Array(31).fill(55))
    await expect(importAesGsmKeyBytes(badKey1)).rejects.toThrow()
    const badKey2 = Uint8Array.from(Array(33).fill(55))
    await expect(importAesGsmKeyBytes(badKey2)).rejects.toThrow()

    // Can import key of length 32
    const goodKey = Uint8Array.from(Array(32).fill(55))
    const key3 = await importAesGsmKeyBytes(goodKey)
    expect(key3).toBeDefined()

    // Can't decrypt with modified imported key
    const modifiedKeyBytes = new Uint8Array(keyBytes)
    modifiedKeyBytes[0] = (modifiedKeyBytes[0] + 1) % 256
    const modifiedKey = await importAesGsmKeyBytes(modifiedKeyBytes)
    await expect(decryptAesGcm(modifiedKey, encrypted1.ciphertext, encrypted1.iv)).rejects.toThrow()
    await expect(
        decryptAesGcm(modifiedKey, encrypted16.ciphertext, encrypted16.iv),
    ).rejects.toThrow()
    await expect(
        decryptAesGcm(modifiedKey, encrypted1000.ciphertext, encrypted1000.iv),
    ).rejects.toThrow()

    // Can't encrypt empty data
    await expect(encryptAesGcm(key, new Uint8Array(0))).rejects.toThrow()
})
