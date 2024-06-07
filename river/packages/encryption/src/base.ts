import { GroupEncryptionSession, UserDeviceCollection } from './olmLib'

import { EncryptionDevice } from './encryptionDevice'

export interface IGroupEncryptionClient {
    downloadUserDeviceInfo(userIds: string[], forceDownload: boolean): Promise<UserDeviceCollection>
    encryptAndShareGroupSessions(
        streamId: string,
        sessions: GroupEncryptionSession[],
        devicesInRoom: UserDeviceCollection,
    ): Promise<void>
    getDevicesInStream(streamId: string): Promise<UserDeviceCollection>
}

export interface IDecryptionParams {
    /** olm.js wrapper */
    device: EncryptionDevice
}

export interface IEncryptionParams {
    client: IGroupEncryptionClient
    /** olm.js wrapper */
    device: EncryptionDevice
}

/**
 * base type for encryption implementations
 */
export abstract class EncryptionAlgorithm implements IEncryptionParams {
    public readonly device: EncryptionDevice
    public readonly client: IGroupEncryptionClient

    /**
     * @param params - parameters
     */
    public constructor(params: IEncryptionParams) {
        this.device = params.device
        this.client = params.client
    }
}

/**
 * base type for decryption implementations
 */
export abstract class DecryptionAlgorithm implements IDecryptionParams {
    public readonly device: EncryptionDevice

    public constructor(params: IDecryptionParams) {
        this.device = params.device
    }
}

/**
 * Exception thrown when decryption fails
 *
 * @param msg - user-visible message describing the problem
 *
 * @param details - key/value pairs reported in the logs but not shown
 *   to the user.
 */
export class DecryptionError extends Error {
    public constructor(public readonly code: string, msg: string) {
        super(msg)
        this.code = code
        this.name = 'DecryptionError'
    }
}

export function isDecryptionError(e: Error): e is DecryptionError {
    return e.name === 'DecryptionError'
}
