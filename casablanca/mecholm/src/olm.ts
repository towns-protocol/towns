import Olm from '@matrix-org/olm'
type OlmLib = typeof Olm

export class OlmMegolmDelegate {
    readonly delegate: OlmLib
    public initialized = false

    constructor(olmLib?: OlmLib) {
        if (olmLib == undefined) {
            this.delegate = Olm
        } else {
            this.delegate = olmLib
        }
    }

    public async init(): Promise<void> {
        // initializes Olm library. This should run before using any Olm classes.
        if (this.initialized) {
            return
        }
        await this.delegate.init()
        this.initialized = typeof this.delegate.get_library_version === 'function'
    }

    public createAccount(): Olm.Account {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Account()
    }

    public createSession(): Olm.Session {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Session()
    }

    public createInboundGroupSession(): Olm.InboundGroupSession {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.InboundGroupSession()
    }

    public createOutboundGroupSession(): Olm.OutboundGroupSession {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.OutboundGroupSession()
    }

    public createPkEncryption(): Olm.PkEncryption {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkEncryption()
    }

    public createPkDecryption(): Olm.PkDecryption {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkDecryption()
    }

    public createPkSigning(): Olm.PkSigning {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkSigning()
    }

    public createOlmUtil(): Olm.Utility {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Utility()
    }
}
