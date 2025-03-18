export function makeTestPersistenceDbName(userId: string, deviceId?: string) {
    return makeTestDbName('p', userId, deviceId)
}

export function makeTestCryptoDbName(userId: string, deviceId?: string) {
    return makeTestDbName('c', userId, deviceId)
}

export function makeTestSyncDbName(userId: string, deviceId?: string) {
    return makeTestDbName('s', userId, deviceId)
}

export function makeTestDbName(prefix: string, userId: string, deviceId?: string) {
    const suffix = deviceId ? `-${deviceId}` : ''
    return `${prefix}-${userId}${suffix}`
}
