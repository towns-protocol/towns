import Olm from '@matrix-org/olm'
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

type OlmLib = typeof Olm

export class EncryptionDelegate {
    private readonly delegate: OlmLib
    private _initialized = false

    public get initialized(): boolean {
        return this._initialized
    }

    constructor(olmLib?: OlmLib) {
        if (olmLib == undefined) {
            this.delegate = Olm
        } else {
            this.delegate = olmLib
        }
    }

    public async init(): Promise<void> {
        // initializes Olm library. This should run before using any Olm classes.
        if (this._initialized) {
            return
        }

        await this.delegate.init()
        this._initialized = typeof this.delegate.get_library_version === 'function'
    }

    public createAccount(): Account {
        if (!this._initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Account()
    }

    public createSession(): Session {
        if (!this._initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Session()
    }

    public createInboundGroupSession(): InboundGroupSession {
        if (!this._initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.InboundGroupSession()
    }

    public createOutboundGroupSession(): OutboundGroupSession {
        if (!this._initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.OutboundGroupSession()
    }

    public createPkEncryption(): PkEncryption {
        if (!this._initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkEncryption()
    }

    public createPkDecryption(): PkDecryption {
        if (!this._initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkDecryption()
    }

    public createPkSigning(): PkSigning {
        if (!this._initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkSigning()
    }

    public createUtility(): Utility {
        if (!this._initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Utility()
    }
}
