import { GroupEncryptionAlgorithmId, GroupEncryptionSession, UserDeviceCollection } from './olmLib'

import { EncryptionDevice } from './encryptionDevice'
import { EncryptedData } from '@river-build/proto'

export interface IGroupEncryptionClient {
    downloadUserDeviceInfo(userIds: string[], forceDownload: boolean): Promise<UserDeviceCollection>
    encryptAndShareGroupSessions(
        streamId: string,
        sessions: GroupEncryptionSession[],
        devicesInRoom: UserDeviceCollection,
        algorithm: GroupEncryptionAlgorithmId,
    ): Promise<void>
    getDevicesInStream(streamId: string): Promise<UserDeviceCollection>
    getMiniblockInfo(streamId: string): Promise<{ miniblockNum: bigint; miniblockHash: Uint8Array }>
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

    abstract ensureOutboundSession(
        streamId: string,
        opts?: { awaitInitialShareSession: boolean },
    ): Promise<void>

    abstract encrypt(streamId: string, payload: string): Promise<EncryptedData>
}

/**
 * base type for decryption implementations
 */
export abstract class DecryptionAlgorithm implements IDecryptionParams {
    public readonly device: EncryptionDevice

    public constructor(params: IDecryptionParams) {
        this.device = params.device
    }

    abstract decrypt(streamId: string, content: EncryptedData): Promise<Uint8Array | string>

    abstract importStreamKey(streamId: string, session: GroupEncryptionSession): Promise<void>

    abstract exportGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<GroupEncryptionSession | undefined>

    abstract exportGroupSessions(): Promise<GroupEncryptionSession[]>
    abstract exportGroupSessionIds(streamId: string): Promise<string[]>
    abstract hasSessionKey(streamId: string, sessionId: string): Promise<boolean>
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
