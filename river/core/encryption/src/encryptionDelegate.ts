/* eslint-disable import/no-unresolved */
// @ts-ignore
// need to include the olmWasm file for the app/browser. BUT this is probably not what we want to do in the long run
// Since we are not bundling the csb SDK, just transpiling TS to JS (like in lib), the SDK is not handling this import at all.
// Actually `?url` is vite specific - which means that the vite bundler in app is handling this import and doing its thing, and our app runs.
// But, if another app were to import this that didn't bundle via Vite, or if Vite changes something, this may break.
import olmWasm from '@matrix-org/olm/olm.wasm?url'
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
import { isNodeEnv } from '@river-build/dlog'

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

        if (isNodeEnv()) {
            await this.delegate.init()
        } else {
            await this.delegate.init({ locateFile: () => olmWasm as unknown })
        }

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
