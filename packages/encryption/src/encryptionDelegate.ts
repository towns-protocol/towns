import Olm, { type OlmImpl } from '@towns-protocol/olm'
import {
    Account,
    InboundGroupSession,
    OutboundGroupSession,
    PkDecryption,
    PkEncryption,
    PkSigning,
    Session,
    Utility,
} from './encryptionTypes'

export class EncryptionDelegate {
    private delegate: OlmImpl | undefined
    public isInitialized = false

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() {}

    public async init(): Promise<void> {
        // initializes Olm library. This should run before using any Olm classes.
        if (this.delegate) {
            return
        }
        this.delegate = await Olm.initAsync()
        this.isInitialized = this.delegate !== undefined
    }

    public createAccount(): Account {
        if (!this.delegate) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Account()
    }

    public createSession(): Session {
        if (!this.delegate) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Session()
    }

    public createInboundGroupSession(): InboundGroupSession {
        if (!this.delegate) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.InboundGroupSession()
    }

    public createOutboundGroupSession(): OutboundGroupSession {
        if (!this.delegate) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.OutboundGroupSession()
    }

    public createPkEncryption(): PkEncryption {
        if (!this.delegate) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkEncryption()
    }

    public createPkDecryption(): PkDecryption {
        if (!this.delegate) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkDecryption()
    }

    public createPkSigning(): PkSigning {
        if (!this.delegate) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkSigning()
    }

    public createUtility(): Utility {
        if (!this.delegate) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Utility()
    }
}
