import Olm from '@matrix-org/olm'

type OlmLib = typeof Olm

export class OlmMegolmDelegate {
    readonly delegate: OlmLib
    private initialized = false

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

    public async createAccount(): Promise<Olm.Account> {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Account()
    }

    public async createSession(): Promise<Olm.Session> {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Session()
    }

    public async createInboundGroupSession(): Promise<Olm.InboundGroupSession> {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.InboundGroupSession()
    }

    public async createOutboundGroupSession(): Promise<Olm.OutboundGroupSession> {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.OutboundGroupSession()
    }

    public async createPkEncryption(): Promise<Olm.PkEncryption> {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkEncryption()
    }

    public async createPkDecryption(): Promise<Olm.PkDecryption> {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkDecryption()
    }

    public async createPkSigning(): Promise<Olm.PkSigning> {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.PkSigning()
    }

    public async createOlmUtil(): Promise<Olm.Utility> {
        if (!this.initialized) {
            throw new Error('olm not initialized')
        }
        return new this.delegate.Utility()
    }
}
