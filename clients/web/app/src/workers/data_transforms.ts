import { EncryptedData } from '@river/proto'

interface ChannelPayload {
    Payload: {
        ChannelPayload: {
            Content: {
                Message: Message
            }
        }
    }
}

interface DmChannelPayload {
    Payload: {
        DmChannelPayload: {
            Content: {
                Message: Message
            }
        }
    }
}

interface GdmChannelPayload {
    Payload: {
        GdmChannelPayload: {
            Content: {
                Message: Message
            }
        }
    }
}

interface Message {
    algorithm?: string
    ciphertext?: string
    sender_key?: string
    session_id?: string
}

export function getEncryptedData(data: unknown): EncryptedData {
    let message: Message | undefined

    if (hasChannelPayloadData(data)) {
        console.log('sw:push hasChannelPayloadData', data.Payload.ChannelPayload.Content.Message)
        message = data.Payload.ChannelPayload.Content.Message
    } else if (hasDmChannelPayloadData(data)) {
        console.log(
            'sw:push hasDmChannelPayloadData',
            data.Payload.DmChannelPayload.Content.Message,
        )
        message = data.Payload.DmChannelPayload.Content.Message
    } else if (hasGdmChannelPayloadData(data)) {
        console.log(
            'sw:push hasGdmChannelPayloadData',
            data.Payload.GdmChannelPayload.Content.Message,
        )
        message = data.Payload.GdmChannelPayload.Content.Message
    }

    if (hasEncryptedData(message)) {
        return new EncryptedData({
            algorithm: message.algorithm,
            senderKey: message.sender_key,
            ciphertext: message.ciphertext,
            sessionId: message.session_id,
        })
    }

    throw new Error('Invalid encrypted data')
}

export function hasEncryptedData(data: unknown): data is Message {
    if (typeof data === 'object' && data !== null) {
        const encryptedData = data as {
            algorithm?: unknown
            ciphertext?: unknown
            sender_key?: unknown
            session_id?: unknown
        }
        return (
            typeof encryptedData.algorithm === 'string' &&
            typeof encryptedData.ciphertext === 'string' &&
            typeof encryptedData.sender_key === 'string' &&
            typeof encryptedData.session_id === 'string'
        )
    }
    return false
}

export function hasChannelPayloadData(data: unknown): data is ChannelPayload {
    return (
        data !== undefined &&
        typeof data === 'object' &&
        typeof (data as ChannelPayload) === 'object' &&
        hasEncryptedData((data as ChannelPayload).Payload?.ChannelPayload?.Content?.Message)
    )
}

export function hasDmChannelPayloadData(data: unknown): data is DmChannelPayload {
    console.log(
        'sw:push hasDmChannelPayloadData.hasEncryptedData',
        hasEncryptedData((data as DmChannelPayload).Payload?.DmChannelPayload?.Content?.Message),
    )
    return (
        data !== undefined &&
        typeof data === 'object' &&
        typeof (data as DmChannelPayload).Payload?.DmChannelPayload?.Content === 'object' &&
        hasEncryptedData((data as DmChannelPayload).Payload?.DmChannelPayload?.Content?.Message)
    )
}

export function hasGdmChannelPayloadData(data: unknown): data is GdmChannelPayload {
    return (
        data !== undefined &&
        typeof data === 'object' &&
        typeof (data as GdmChannelPayload).Payload?.GdmChannelPayload?.Content === 'object' &&
        hasEncryptedData((data as GdmChannelPayload).Payload?.GdmChannelPayload?.Content?.Message)
    )
}
