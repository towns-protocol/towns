export interface IRoomEncryption {
    algorithm: string
    rotation_period_ms?: number
    rotation_period_msgs?: number
}

export interface ISessionInfo {
    deviceKey: string
    sessionId: string
    session: string
    lastReceivedMessageTs: number
}

export interface AccountRecord {
    id: string
    accountPickle: string
}

export interface MegolmSessionRecord {
    sessionId: string
    session: string
    streamId: string
}

export interface UserDeviceRecord {
    userId: string
    deviceId: string
    deviceKey: string
    fallbackKey: string
    expirationTimestamp: number
}
