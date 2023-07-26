import { dlog } from '../../dlog'
import { RDK, RK } from '../rk'
import { CryptoStore, CryptoTxn } from './base'
import { IndexedDBCryptoStore } from './indexeddb-crypto-store'

const log = dlog('csb:auth')

export class Auth {
    private store: CryptoStore

    constructor(store: CryptoStore) {
        this.store = store
    }

    public initializeRK(): Promise<RK> {
        return this.store.doTxn(
            'readwrite',
            [IndexedDBCryptoStore.STORE_RK],
            (txn) => this._initializeRK(txn),
            log,
        )
    }

    private _initializeRK(txn: CryptoTxn): Promise<RK> {
        return this.store.getRK(txn, (rk) => {
            if (rk === null) {
                rk = RK.createRandom()
            }
            this.store.storeRK(txn, rk)
            return rk
        })
    }

    public initializeRDK(): Promise<RDK> {
        return this.store.doTxn(
            'readwrite',
            [IndexedDBCryptoStore.STORE_RK],
            (txn) => this._initializeRDK(txn),
            log,
        )
    }

    private _initializeRDK(txn: CryptoTxn): Promise<RDK> {
        return this.store.getRDK(txn, (rdk) => {
            if (rdk === null) {
                rdk = RDK.createRandom()
                this.store.storeRDK(txn, rdk)
            }
            return rdk
        })
    }

    public async signRDK(): Promise<RDK> {
        return this.store.doTxn(
            'readwrite',
            [IndexedDBCryptoStore.STORE_RK],
            (txn) =>
                this._initializeRK(txn).then((rk) =>
                    this._initializeRDK(txn).then(async (rdk) => {
                        if (rdk.isSigned()) {
                            throw new Error('RDK is already signed')
                        }
                        rdk = await rk.signRdk(rdk)
                        this.store.storeRDK(txn, rdk)
                        return rdk
                    }),
                ),
            log,
        )
    }
}
