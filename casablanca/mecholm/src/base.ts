import { MegolmSession, UserDeviceCollection } from './olmLib'

import { OlmDevice } from './olmDevice'

export interface IMegolmClient {
    downloadUserDeviceInfo(userIds: string[], forceDownload: boolean): Promise<UserDeviceCollection>
    encryptAndShareMegolmSessions(
        streamId: string,
        sessions: MegolmSession[],
        devicesInRoom: UserDeviceCollection,
    ): Promise<void>
    getDevicesInStream(streamId: string): Promise<UserDeviceCollection>
}

export interface IDecryptionParams {
    /** olm.js wrapper */
    olmDevice: OlmDevice
}

export interface IEncryptionParams {
    client: IMegolmClient
    /** olm.js wrapper */
    olmDevice: OlmDevice
}

/**
 * base type for encryption implementations
 */
export abstract class EncryptionAlgorithm implements IEncryptionParams {
    public readonly olmDevice: OlmDevice
    public readonly client: IMegolmClient

    /**
     * @param params - parameters
     */
    public constructor(params: IEncryptionParams) {
        this.olmDevice = params.olmDevice
        this.client = params.client
    }
}

/**
 * base type for decryption implementations
 */
export abstract class DecryptionAlgorithm implements IDecryptionParams {
    public readonly olmDevice: OlmDevice

    public constructor(params: IDecryptionParams) {
        this.olmDevice = params.olmDevice
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
