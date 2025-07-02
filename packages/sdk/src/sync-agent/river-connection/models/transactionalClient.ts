import { CryptoStore } from '@towns-protocol/encryption'
import { EntitlementsDelegate } from '../../../decryptionExtensions'
import { Client, ClientEvents, ClientOptions } from '../../../client'
import { StreamRpcClient } from '../../../makeStreamRpcClient'
import { SignerContext } from '../../../signerContext'
import { Store } from '../../../store/store'

export class TransactionalClient extends Client {
    store: Store
    constructor(
        store: Store,
        signerContext: SignerContext,
        rpcClient: StreamRpcClient,
        cryptoStore: CryptoStore,
        entitlementsDelegate: EntitlementsDelegate,
        opts?: ClientOptions,
    ) {
        super(signerContext, rpcClient, cryptoStore, entitlementsDelegate, opts)
        this.store = store
    }

    override emit<E extends keyof ClientEvents>(
        event: E,
        ...args: Parameters<ClientEvents[E]>
    ): boolean {
        return this.store.withTransaction(event.toLocaleString(), () => {
            return super.emit(event, ...args)
        })
    }
}
