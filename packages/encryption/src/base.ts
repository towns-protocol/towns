import { GroupEncryptionAlgorithmId, GroupEncryptionSession } from './olmLib'

import { EncryptionDevice } from './encryptionDevice'
import { EncryptedData } from '@towns-protocol/proto'

export interface IGroupEncryptionClient {
    encryptAndShareGroupSessionsToStream(
        streamId: string,
        sessions: GroupEncryptionSession[],
        algorithm: GroupEncryptionAlgorithmId,
        priorityUserIds: string[],
    ): Promise<void>
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

export interface EnsureOutboundSessionOpts {
    shareShareSessionTimeoutMs?: number // timeout for the initial share session, pass 0 if you want to wait for entire share session to complete (send keys to all members)
    priorityUserIds?: string[] // ensure these users are sent keys and sent first
    miniblockInfo?: { miniblockNum: bigint; miniblockHash: Uint8Array } // miniblock info to use for the session, if not provided, will be fetched from the client
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
        opts?: EnsureOutboundSessionOpts,
    ): Promise<string>

    abstract hasOutboundSession(streamId: string): Promise<boolean>

    abstract encrypt_deprecated_v0(streamId: string, payload: string): Promise<EncryptedData>
    abstract encrypt(streamId: string, payload: Uint8Array): Promise<EncryptedData>
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
    public constructor(
        public readonly code: string,
        msg: string,
    ) {
        super(msg)
        this.code = code
        this.name = 'DecryptionError'
    }
}

export function isDecryptionError(e: Error): e is DecryptionError {
    return e.name === 'DecryptionError'
}
