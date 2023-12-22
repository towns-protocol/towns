import { Client } from '../../client'
import { OlmDevice } from '../olmDevice'
import { Crypto } from '../crypto'
import { IRoomEncryption } from '../store/types'

export type DecryptionClassParams<P extends IParams = IParams> = Omit<P, 'config'>

export interface IParams {
    /** The UserID for the local user */
    userId: string
    /** crypto core */
    crypto: Crypto
    /** olm.js wrapper */
    olmDevice: OlmDevice
    /** base api interface */
    baseApis: Client
    /** The ID of the room we will be sending to */
    channelId?: string
    /** The body of the r.room.encryption event */
    config: IRoomEncryption & object
}

/**
 * base type for encryption implementations
 */
export abstract class EncryptionAlgorithm {
    protected readonly userId: string
    protected readonly crypto: Crypto
    protected readonly olmDevice: OlmDevice
    protected readonly baseApis: Client
    protected readonly channelId?: string

    /**
     * @param params - parameters
     */
    public constructor(params: IParams) {
        this.userId = params.userId
        this.crypto = params.crypto
        this.olmDevice = params.olmDevice
        this.baseApis = params.baseApis
        this.channelId = params.channelId
    }
}

/**
 * base type for decryption implementations
 */
export abstract class DecryptionAlgorithm {
    protected readonly userId: string
    protected readonly crypto: Crypto
    protected readonly olmDevice: OlmDevice
    protected readonly baseApis: Client
    protected readonly channelId?: string

    public constructor(params: DecryptionClassParams) {
        this.userId = params.userId
        this.crypto = params.crypto
        this.olmDevice = params.olmDevice
        this.baseApis = params.baseApis
        this.channelId = params.channelId
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
