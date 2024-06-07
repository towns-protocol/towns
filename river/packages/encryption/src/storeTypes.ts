export interface AccountRecord {
    id: string
    accountPickle: string
}

export interface GroupSessionRecord {
    sessionId: string
    session: string
    streamId: string
}

export interface UserDeviceRecord {
    userId: string
    deviceKey: string
    fallbackKey: string
    expirationTimestamp: number
}
