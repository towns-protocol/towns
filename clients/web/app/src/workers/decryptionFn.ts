import {
    CryptoStore,
    DecryptionAlgorithm,
    EncryptionDelegate,
    EncryptionDevice,
    GroupDecryption,
    GroupEncryptionAlgorithmId,
    HybridGroupDecryption,
    parseGroupEncryptionAlgorithmId,
} from '@towns-protocol/encryption'

import { EncryptedData, EncryptedDataVersion } from '@towns-protocol/proto'
import { EncryptedContent, logNever, toDecryptedContent } from '@towns-protocol/sdk'

// OlmLib fails initialization if this is not initialized
globalThis.OLM_OPTIONS = {}
// cache the crypto store and decryptor for each user
const cryptoStoreCache = new Map<string, CryptoStore>()
const decryptorCache = new Map<string, Record<GroupEncryptionAlgorithmId, DecryptionAlgorithm>>()
const log = console.debug.bind(console, 'sw:push:')

export interface PlaintextDetails {
    body: string | undefined
    reaction: string | undefined
    refEventId?: string
}

export async function decrypt(
    userId: string,
    databaseName: string,
    channelId: string,
    kind: EncryptedContent['kind'],
    encryptedData: EncryptedData,
): Promise<PlaintextDetails | undefined> {
    const decryptor = await getDecryptor(userId, databaseName)
    const algorithm = parseGroupEncryptionAlgorithmId(encryptedData.algorithm)
    if (algorithm.kind === 'unrecognized') {
        return undefined
    }
    const plaintext = await decryptor[algorithm.value].decrypt(channelId, encryptedData)
    log('decrypted plaintext', plaintext)
    // if the decryption is successful, plaintext has the string, else it's null
    const plaintextBody = plaintext
        ? extractDetails(kind, encryptedData.version, plaintext, encryptedData.refEventId)
        : undefined

    log('regex plaintext body', plaintextBody ?? 'null')
    return plaintextBody
}

async function getDecryptor(userId: string, databaseName: string) {
    if (!decryptorCache.has(userId)) {
        const cryptoStore = getCryptoStore(userId, databaseName)
        log('getCryptoStore', {
            cryptoStoreName: cryptoStore ? cryptoStore.name : 'undefined',
        })
        if (!cryptoStore) {
            throw new Error('Could not get crypto store')
        }
        const decryptor = await newGroupDecryption(cryptoStore)
        decryptorCache.set(userId, decryptor)
    }
    const decryptor = decryptorCache.get(userId)
    if (!decryptor) {
        throw new Error('Could not get decryptor')
    }
    return decryptor
}

function getCryptoStore(userId: string, databaseName: string) {
    if (!cryptoStoreCache.has(userId)) {
        const cryptoStore = new CryptoStore(databaseName, userId)
        cryptoStoreCache.set(userId, cryptoStore)
    }
    return cryptoStoreCache.get(userId)
}

async function newGroupDecryption(
    cryptoStore: CryptoStore,
): Promise<Record<GroupEncryptionAlgorithmId, DecryptionAlgorithm>> {
    const delegate = new EncryptionDelegate()
    await delegate.init()
    const encyptionDevice = new EncryptionDevice(delegate, cryptoStore)
    return {
        [GroupEncryptionAlgorithmId.GroupEncryption]: new GroupDecryption({
            device: encyptionDevice,
        }),
        [GroupEncryptionAlgorithmId.HybridGroupEncryption]: new HybridGroupDecryption({
            device: encyptionDevice,
        }),
    }
}

function extractDetails(
    kind: EncryptedContent['kind'],
    version: EncryptedDataVersion,
    clearText: string | Uint8Array,
    refEventId?: string,
): PlaintextDetails {
    const content = toDecryptedContent(kind, version, clearText)
    switch (content.kind) {
        case 'channelMessage':
            switch (content.content.payload.case) {
                case 'post':
                    switch (content.content.payload.value.content.case) {
                        case 'text': {
                            const text = content.content.payload.value.content.value.body
                            const count = (text.match(/\\n/g) || []).length
                            // if there are multiple newlines, replace with '...'
                            // else replace with ''
                            const crReplacement = count > 1 ? ' - ' : ''
                            const cleanBody = text
                                .replace(/\\n/g, crReplacement)
                                .replace(/\\"/g, '"')
                            return {
                                body: cleanBody,
                                reaction: undefined,
                                refEventId,
                            }
                        }
                        case 'gm':
                        case 'image':
                        case undefined:
                            return {
                                body: undefined,
                                reaction: undefined,
                                refEventId,
                            }
                        default:
                            logNever(content.content.payload.value.content)
                            return {
                                body: undefined,
                                reaction: undefined,
                                refEventId,
                            }
                    }
                case 'reaction':
                    return {
                        body: undefined,
                        reaction: content.content.payload.value.reaction,
                        refEventId: refEventId ?? content.content.payload.value.refEventId,
                    }
                case 'edit':
                case 'redaction':
                case undefined:
                    return {
                        body: undefined,
                        reaction: undefined,
                        refEventId,
                    }
                default:
                    logNever(content.content.payload)
                    return {
                        body: undefined,
                        reaction: undefined,
                        refEventId,
                    }
            }
        case 'text':
            return {
                body: content.content,
                reaction: undefined,
                refEventId,
            }
        case 'channelProperties':
            return {
                body: undefined,
                reaction: undefined,
                refEventId,
            }
        case 'unsupported':
            return {
                body: undefined,
                reaction: undefined,
                refEventId,
            }
        default:
            logNever(content)
            return {
                body: undefined,
                reaction: undefined,
                refEventId,
            }
    }
}
