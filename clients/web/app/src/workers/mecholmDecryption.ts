import { CryptoStore, MegolmDecryption, OlmDevice, OlmMegolmDelegate } from '@river/mecholm'

import { EncryptedData } from '@river/proto'

// OlmLib fails initialization if this is not initialized
globalThis.OLM_OPTIONS = {}
// cache the crypto store and decryptor for each user
const cryptoStoreCache = new Map<string, CryptoStore>()
const decryptorCache = new Map<string, MegolmDecryption>()

export async function decryptWithMegolm(
    userId: string,
    channelId: string,
    encryptedData: EncryptedData,
) {
    const decryptor = await getDecryptor(userId)
    const plaintext = await decryptor.decrypt(channelId, encryptedData)
    console.log('sw:push: decrypted plaintext', plaintext)
    // if the decryption is successful, plaintext has the string, else it's undefined
    const plaintextBody = plaintext ? getPlaintextBody(plaintext) : undefined
    console.log('sw:push: decrypted plaintextBody', plaintextBody ?? 'undefined')
    return plaintextBody
}

async function getDecryptor(userId: string) {
    if (!decryptorCache.has(userId)) {
        const cryptoStore = getCryptoStore(userId)
        if (!cryptoStore) {
            throw new Error('Could not get crypto store')
        }
        const decryptor = await newMegolmDecryption(userId, cryptoStore)
        decryptorCache.set(userId, decryptor)
    }
    const decryptor = decryptorCache.get(userId)
    if (!decryptor) {
        throw new Error('Could not get decryptor')
    }
    return decryptor
}

function getCryptoStore(userId: string) {
    if (!cryptoStoreCache.has(userId)) {
        const cryptoStore = new CryptoStore(`database-${userId}`, userId)
        cryptoStoreCache.set(userId, cryptoStore)
    }
    return cryptoStoreCache.get(userId)
}

async function newMegolmDecryption(
    userId: string,
    cryptoStore: CryptoStore,
): Promise<MegolmDecryption> {
    const olmDelegate = new OlmMegolmDelegate()
    await olmDelegate.init()
    const olmDevice = new OlmDevice(olmDelegate, cryptoStore)
    return new MegolmDecryption({ olmDevice })
}

function getPlaintextBody(input: string): string | undefined {
    const regex = /"body"\s*:\s*"((?:\\"|[^"])*)"/
    const match = input.match(regex)

    if (match) {
        const extractedBody = match[1].replace(/\\"/g, '"')
        return extractedBody
    } else {
        return undefined
    }
}
