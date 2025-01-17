import { InboundGroupSessionData } from './encryptionDevice'

export interface AccountRecord {
    id: string
    accountPickle: string
}

export interface GroupSessionRecord {
    sessionId: string
    session: string
    streamId: string
}

export interface HybridGroupSessionRecord {
    sessionId: string
    streamId: string
    sessionKey: Uint8Array
    miniblockNum: bigint
}

export interface UserDeviceRecord {
    userId: string
    deviceKey: string
    fallbackKey: string
    expirationTimestamp: number
}

export interface ExtendedInboundGroupSessionData extends InboundGroupSessionData {
    streamId: string
    sessionId: string
}
