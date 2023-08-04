import { dlog } from '../../dlog'
import { RDK, RK, SerializedRDK, SerializedRK, ISerializeable } from '../rk'
import { Mode } from './base'
import { promiseifyTxn } from './indexeddb-crypto-store-backend'

const log = dlog('csb:riverkeys')

type Serialized<T> = T extends RK ? SerializedRK : T extends RDK ? SerializedRDK : never

interface IRiverKeysCreate<T> {
    createRandom(): T
    from(s: Serialized<T>): T
}

export class RiverKeysStorage {
    static readonly STORE_RK = 'river_keys'

    private version = 0
    private db = null as IDBDatabase | null

    private readonly indexedDB: IDBFactory | null
    private readonly dbName: string

    constructor(indexedDB: IDBFactory | null, dbName: string) {
        this.indexedDB = indexedDB
        this.dbName = dbName
        log('csb:sdk:riverkeys:indexeddb', !!indexedDB)
    }

    public async startup(): Promise<void> {
        const startupPomise = new Promise<void>((resolve, reject) => {
            if (!this.indexedDB) {
                throw new Error('No indexedDB')
            }
            const req = this.indexedDB.open(this.dbName, this.DB_MIGRATIONS.length)

            req.onupgradeneeded = (ev): void => {
                const db = req.result
                const oldVersion = ev.oldVersion
                this.DB_MIGRATIONS.forEach((fn, i) => {
                    const version = i + 1
                    if (oldVersion < version) {
                        log(`Running migration ${version}`)
                        fn(db)
                    }
                })
            }

            req.onblocked = (): void => {
                log(`can't yet open RiverKeysStorage because it is open elsewhere`)
                reject(new Error("can't yet open RiverKeysStorage because it is open elsewhere"))
            }

            req.onerror = (ev): void => {
                log('Error connecting to indexeddb', ev)
                reject(new Error('Error connecting to indexeddb'))
            }

            req.onsuccess = (): void => {
                const db = req.result

                log(`connected to indexeddb ${this.dbName}`)
                this.version = db.version
                this.db = db
                resolve()
            }
        })
        return startupPomise
    }

    public withTransaction<T>(thunk: (txn: IDBTransaction) => Promise<T>): Promise<T> {
        return this.doTxn('readwrite', [RiverKeysStorage.STORE_RK], (txn) => {
            return thunk(txn)
        })
    }

    public initializeRK(txn: IDBTransaction): Promise<RK> {
        return this._initializeKey(txn, 'rk', RK)
    }

    public async initializeRDK(txn: IDBTransaction): Promise<RDK> {
        const rk = await this.initializeRK(txn)
        const rdk = await this._initializeKey(txn, 'rdk', RDK)
        if (!rdk.isSigned()) {
            return rk.signRdk(rdk)
        }
        return rdk
    }

    async signRDK(txn: IDBTransaction): Promise<RDK> {
        return this.initializeRK(txn).then((rk) =>
            this.initializeRDK(txn).then(async (rdk) => {
                if (rdk.isSigned()) {
                    throw new Error('RDK is already signed')
                }
                rdk = await rk.signRdk(rdk)
                return this._storeKey<RDK, SerializedRDK>(txn, 'rdk', rdk.serialize()).then(
                    () => rdk,
                )
            }),
        )
    }

    private async _initializeKey<T extends ISerializeable<S>, S extends Serialized<T>>(
        txn: IDBTransaction,
        name: string,
        c: IRiverKeysCreate<T>,
    ): Promise<T> {
        const key = await this._getKey(txn, name, c)
        if (!key) {
            const key = c.createRandom()
            await this._storeKey<T, Serialized<T>>(txn, name, key.serialize())
            return key
        }
        return key
    }

    private _getKey<T extends ISerializeable<S>, S extends Serialized<T>>(
        txn: IDBTransaction,
        name: string,
        c: IRiverKeysCreate<T>,
    ): Promise<T | undefined> {
        const objectStore = txn.objectStore(RiverKeysStorage.STORE_RK)
        const getReq: IDBRequest<S> = objectStore.get(name)
        return new Promise((resolve, reject) => {
            getReq.onsuccess = (): void => {
                if (getReq.result) {
                    resolve(c.from(getReq.result))
                } else {
                    resolve(undefined)
                }
            }
            getReq.onerror = reject
        })
    }

    private async _storeKey<T, S extends Serialized<T>>(
        txn: IDBTransaction,
        name: string,
        key: S,
    ): Promise<S> {
        const objectStore = txn.objectStore(RiverKeysStorage.STORE_RK)

        objectStore.put(key, name)
        return key
    }

    async doTxn<T>(
        mode: Mode,
        stores: string | string[],
        func: (txn: IDBTransaction) => T | Promise<T>,
    ): Promise<T> {
        if (!this.db) {
            throw new Error('Not connected to indexeddb')
        }
        const txn = this.db.transaction(stores, mode)
        const txPromise = promiseifyTxn(txn)
        let result = func(txn)
        if (!(result instanceof Promise)) {
            result = Promise.resolve(result)
        }
        return result.then((result) => {
            return txPromise.then(() => result)
        })
    }

    private DB_MIGRATIONS: ((db: IDBDatabase) => void)[] = [
        (db): void => {
            db.createObjectStore('river_keys')
        },
    ]
}
