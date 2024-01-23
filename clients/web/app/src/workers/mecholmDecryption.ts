import { CryptoStore, MegolmDecryption, OlmDevice, OlmMegolmDelegate } from '@river/mecholm'

import { EncryptedData } from '@river/proto'

// OlmLib fails initialization if this is not initialized
globalThis.OLM_OPTIONS = {}
// cache the crypto store and decryptor for each user
const cryptoStoreCache = new Map<string, CryptoStore>()
const decryptorCache = new Map<string, MegolmDecryption>()
const log = console.debug.bind(console, 'sw:push:')

export interface PlaintextDetails {
    body: string | undefined
    mentions: string | undefined
    threadId: string | undefined
    reaction: string | undefined
}

export async function decryptWithMegolm(
    userId: string,
    channelId: string,
    encryptedData: EncryptedData,
): Promise<PlaintextDetails | undefined> {
    const decryptor = await getDecryptor(userId)
    const plaintext = await decryptor.decrypt(channelId, encryptedData)
    log('decrypted plaintext', plaintext)
    // if the decryption is successful, plaintext has the string, else it's null
    const plaintextBody = plaintext ? extractDetails(plaintext) : undefined
    log('regex plaintext body', plaintextBody ?? 'null')
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

const bodyRegex = /"body":"(.*?)"(?=,|})/
const mentionsRegex = /"mentions":(\[\{.*?\}\])(?=,|})/
const threadIdRegex = /"threadId":"(.*?)"(?=,|})/
const reactionRegex = /"reaction":"(.*?)"(?=,|})/

function extractDetails(jsonString: string): PlaintextDetails {
    const bodyMatch = jsonString.match(bodyRegex)
    const mentionsMatch = jsonString.match(mentionsRegex)
    const threadIdMatch = jsonString.match(threadIdRegex)
    const reactionMatch = jsonString.match(reactionRegex)
    // replace all \n with ... string because notification body cannot have newlines
    // replace all \" with "
    const cleanBody = bodyMatch
        ? bodyMatch[1].replace(/\\n/g, '...').replace(/\\"/g, '"')
        : undefined
    return {
        body: cleanBody,
        mentions: mentionsMatch ? mentionsMatch[1] : undefined,
        threadId: threadIdMatch ? threadIdMatch[1] : undefined,
        reaction: reactionMatch ? reactionMatch[1] : undefined,
    }
}
