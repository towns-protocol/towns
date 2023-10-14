/* eslint-disable import/no-unresolved */
// @ts-ignore
// need to include the olmWasm file for the app/browser. BUT this is probably not what we want to do in the long run
// Since we are not bundling the csb SDK, just transpiling TS to JS (like in lib), the SDK is not handling this import at all.
// Actually `?url` is vite specific - which means that the vite bundler in app is handling this import and doing its thing, and our app runs.
// But, if another app were to import this that didn't bundle via Vite, or if Vite changes something, this may break.
import olmWasm from '@matrix-org/olm/olm.wasm?url'
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
        // see note above re. wasm - including it needed for app, but it breaks Jest tests
        if (process.env.JEST_WORKER_ID) {
            await this.delegate.init()
        } else {
            await this.delegate.init({ locateFile: () => olmWasm as unknown })
        }

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
