import {
    CryptoStore,
    EncryptionDelegate,
    EncryptionDevice,
    GroupDecryption,
} from '@river/encryption'

import { EncryptedData } from '@river/proto'

// OlmLib fails initialization if this is not initialized
globalThis.OLM_OPTIONS = {}
// cache the crypto store and decryptor for each user
const cryptoStoreCache = new Map<string, CryptoStore>()
const decryptorCache = new Map<string, GroupDecryption>()
const log = console.debug.bind(console, 'sw:push:')

export interface PlaintextDetails {
    body: string | undefined
    mentions: string | undefined
    threadId: string | undefined
    reaction: string | undefined
}

export async function decrypt(
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
        const decryptor = await newGroupDecryption(userId, cryptoStore)
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

async function newGroupDecryption(
    userId: string,
    cryptoStore: CryptoStore,
): Promise<GroupDecryption> {
    const delegate = new EncryptionDelegate()
    await delegate.init()
    const encyptionDevice = new EncryptionDevice(delegate, cryptoStore)
    return new GroupDecryption({ device: encyptionDevice })
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
    /**
     * - replace all \n because notification body cannot
     * have newlines.
     * - replace all \" with "
     * */
    let cleanBody: string | undefined
    if (bodyMatch && bodyMatch.length > 0 && bodyMatch[1]) {
        const text = bodyMatch[1]
        const count = (text.match(/\\n/g) || []).length
        // if there are multiple newlines, replace with '...'
        // else replace with ''
        const crReplacement = count > 1 ? ' - ' : ''
        cleanBody = text.replace(/\\n/g, crReplacement).replace(/\\"/g, '"')
    }
    return {
        body: cleanBody,
        mentions: mentionsMatch ? mentionsMatch[1] : undefined,
        threadId: threadIdMatch ? threadIdMatch[1] : undefined,
        reaction: reactionMatch ? reactionMatch[1] : undefined,
    }
}
