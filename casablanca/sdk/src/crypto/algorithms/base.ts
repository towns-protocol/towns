import { Client } from '../../client'
import { OlmDevice } from '../olmDevice'
import { IEventDecryptionResult, Crypto, IncomingRoomKeyRequest } from '../crypto'
import { DeviceInfo } from '../deviceInfo'
import { DeviceInfoMap } from '../deviceList'
import { IRoomEncryption } from '../store/base'
import { IEncryptedContent } from '../olmLib'
import { RiverEvent, IClearContent } from '../../event'
import { MegolmSession } from '@river/proto'
import { ClearContent, RiverEventV2 } from '../../eventV2'

/**
 * Map of registered encryption algorithm classes. A map from string to {@link EncryptionAlgorithm} class
 */
export const ENCRYPTION_CLASSES = new Map<string, new (params: IParams) => EncryptionAlgorithm>()

export type DecryptionClassParams<P extends IParams = IParams> = Omit<P, 'deviceId' | 'config'>

/**
 * map of registered encryption algorithm classes. Map from string to {@link DecryptionAlgorithm} class
 */
export const DECRYPTION_CLASSES = new Map<
    string,
    new (params: DecryptionClassParams) => DecryptionAlgorithm
>()

export interface IParams {
    /** The UserID for the local user */
    userId: string
    /** The identifier for this device. */
    deviceId: string
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
    protected readonly deviceId: string
    protected readonly crypto: Crypto
    protected readonly olmDevice: OlmDevice
    protected readonly baseApis: Client
    protected readonly channelId?: string

    /**
     * @param params - parameters
     */
    public constructor(params: IParams) {
        this.userId = params.userId
        this.deviceId = params.deviceId
        this.crypto = params.crypto
        this.olmDevice = params.olmDevice
        this.baseApis = params.baseApis
        this.channelId = params.channelId
    }

    /**
     * Encrypt a message event for a set of users or a room
     *
     * @public
     *
     * @param content - event content
     *
     * @returns Promise which resolves to the new event body
     */
    public abstract encryptMessage(
        usersOrRoom: string[] | string,
        eventType: string,
        content: IClearContent,
    ): Promise<IEncryptedContent>

    /**
     * Called when the membership of a member of the room changes.
     *
     * @param event -  event causing the change
     * @param member -  user whose membership changed
     * @param oldMembership -  previous membership
     * @public
     */
    // todo: implement
    // public onRoomMembership(event: RiverEvent, member: RoomMember, oldMembership?: string): void {}

    public reshareKeyWithDevice?(
        senderKey: string,
        sessionId: string,
        userId: string,
        channelId: string,
        device: DeviceInfo,
    ): Promise<void>

    public forceDiscardSession?(): void
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

    /**
     * Decrypt an event
     *
     * @param event - undecrypted event
     *
     * @returns promise which
     * resolves once we have finished decrypting. Rejects with an
     * `algorithms.DecryptionError` if there is a problem decrypting the event.
     */
    public abstract decryptEvent(event: RiverEvent): Promise<IEventDecryptionResult>

    /**
     * Decrypt an event
     *
     * @param event - undecrypted event
     *
     * @returns promise which
     * resolves once we have finished decrypting. Rejects with an
     * `algorithms.DecryptionError` if there is a problem decrypting the event.
     */
    public abstract decryptEventV2(event: RiverEventV2): Promise<ClearContent>

    /**
     * Handle a key event
     *
     * @param _params - event key event
     */
    public async onRoomKeyEvent(_params: RiverEvent): Promise<void> {
        // ignore by default
    }

    /**
     * Import a room key
     *
     * @param _opts - object
     */

    public async importRoomKey(_session: MegolmSession, _opts: object): Promise<void> {
        // ignore by default
    }

    /**
     * Determine if we have the keys necessary to respond to a room key request
     *
     * @returns true if we have the keys and could (theoretically) share
     *  them; else false.
     */
    public hasKeysForKeyRequest(_keyRequest: IncomingRoomKeyRequest): Promise<boolean> {
        return Promise.resolve(false)
    }

    /**
     * Send the response to a room key request
     *
     */
    public shareKeysWithDevice(_keyRequest: IncomingRoomKeyRequest): void {
        throw new Error('shareKeysWithDevice not supported for this DecryptionAlgorithm')
    }

    /**
     * Retry decrypting all the events from a sender that haven't been
     * decrypted yet.
     *
     * @param _senderKey - the sender's key
     */
    public async retryDecryptionFromSender(_senderKey: string): Promise<boolean> {
        // ignore by default
        return false
    }

    public onRoomKeyWithheldEvent?(event: RiverEvent): Promise<void>
    public sendSharedHistoryInboundSessions?(
        channelId: string,
        devicesByUser: Map<string, DeviceInfo[]>,
    ): Promise<void>
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
    public readonly detailedString: string

    public constructor(
        public readonly code: string,
        msg: string,
        details?: Record<string, string | Error>,
    ) {
        super(msg)
        this.code = code
        this.name = 'DecryptionError'
        this.detailedString = detailedStringForDecryptionError(this, details)
    }
}

function detailedStringForDecryptionError(
    err: DecryptionError,
    details?: Record<string, string | Error>,
): string {
    let result = err.name + '[msg: ' + err.message

    if (details) {
        result +=
            ', ' +
            Object.keys(details)
                .map((k) => {
                    const v = details[k]
                    return `${k}: ${v instanceof Error ? v.message : v}`
                })
                .join(', ')
    }

    result += ']'

    return result
}

export class UnknownDeviceError extends Error {
    /**
     * Exception thrown specifically when we want to warn the user to consider
     * the security of their conversation before continuing
     *
     * @param msg - message describing the problem
     * @param devices - set of unknown devices per user we're warning about
     */
    public constructor(
        msg: string,
        public readonly devices: DeviceInfoMap,
        public event?: RiverEvent,
    ) {
        super(msg)
        this.name = 'UnknownDeviceError'
        this.devices = devices
    }
}

/**
 * Registers an encryption/decryption class for a particular algorithm
 *
 * @param algorithm - algorithm tag to register for
 *
 * @param encryptor - {@link EncryptionAlgorithm} implementation
 *
 * @param decryptor - {@link DecryptionAlgorithm} implementation
 */
export function registerAlgorithm<P extends IParams = IParams>(
    algorithm: string,
    encryptor: new (params: P) => EncryptionAlgorithm,
    decryptor: new (params: DecryptionClassParams<P>) => DecryptionAlgorithm,
): void {
    ENCRYPTION_CLASSES.set(algorithm, encryptor as new (params: IParams) => EncryptionAlgorithm)
    DECRYPTION_CLASSES.set(
        algorithm,
        decryptor as new (params: DecryptionClassParams) => DecryptionAlgorithm,
    )
}
