import { EncryptedData } from '@river-build/proto'

interface ChannelPayload {
    channelPayload: {
        message: Message
    }
}

interface DmChannelPayload {
    dmChannelPayload: {
        message: Message
    }
}

interface GdmChannelPayload {
    gdmChannelPayload: {
        message: Message
    }
}

interface Message {
    algorithm?: string
    ciphertext?: string
    senderKey?: string
    sessionId?: string
}

export function getEncryptedData(data: unknown): EncryptedData {
    let message: Message | undefined

    if (hasChannelPayloadData(data)) {
        console.log('sw:push hasChannelPayloadData', data.channelPayload.message)
        message = data.channelPayload.message
    } else if (hasDmChannelPayloadData(data)) {
        console.log('sw:push hasDmChannelPayloadData', data.dmChannelPayload.message)
        message = data.dmChannelPayload.message
    } else if (hasGdmChannelPayloadData(data)) {
        console.log('sw:push hasGdmChannelPayloadData', data.gdmChannelPayload.message)
        message = data.gdmChannelPayload.message
    }

    if (hasEncryptedData(message)) {
        return new EncryptedData({
            algorithm: message.algorithm,
            senderKey: message.senderKey,
            ciphertext: message.ciphertext,
            sessionId: message.sessionId,
        })
    }

    throw new Error('Invalid encrypted data')
}

export function hasEncryptedData(data: unknown): data is Message {
    if (typeof data === 'object' && data !== null) {
        const encryptedData = data as {
            algorithm?: unknown
            ciphertext?: unknown
            senderKey?: unknown
            sessionId?: unknown
        }
        return (
            typeof encryptedData.algorithm === 'string' &&
            typeof encryptedData.ciphertext === 'string' &&
            typeof encryptedData.senderKey === 'string' &&
            typeof encryptedData.sessionId === 'string'
        )
    }
    return false
}

export function hasChannelPayloadData(data: unknown): data is ChannelPayload {
    return (
        data !== undefined &&
        typeof data === 'object' &&
        typeof (data as ChannelPayload) === 'object' &&
        hasEncryptedData((data as ChannelPayload).channelPayload?.message)
    )
}

export function hasDmChannelPayloadData(data: unknown): data is DmChannelPayload {
    console.log(
        'sw:push hasDmChannelPayloadData.hasEncryptedData',
        hasEncryptedData((data as DmChannelPayload).dmChannelPayload?.message),
    )
    return (
        data !== undefined &&
        typeof data === 'object' &&
        typeof (data as DmChannelPayload).dmChannelPayload?.message === 'object' &&
        hasEncryptedData((data as DmChannelPayload).dmChannelPayload?.message)
    )
}

export function hasGdmChannelPayloadData(data: unknown): data is GdmChannelPayload {
    return (
        data !== undefined &&
        typeof data === 'object' &&
        typeof (data as GdmChannelPayload).gdmChannelPayload?.message === 'object' &&
        hasEncryptedData((data as GdmChannelPayload).gdmChannelPayload?.message)
    )
}
