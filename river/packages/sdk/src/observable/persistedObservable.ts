import { check } from '@river-build/dlog'
import { Observable } from './observable'
import { LoadPriority, Store, Identifiable } from '../store/store'
import { isDefined } from '../check'

export interface PersistedOpts {
    tableName: string
}

export type PersistedModel<T> =
    | { status: 'loading'; data: T }
    | { status: 'loaded'; data: T }
    | { status: 'error'; data: T; error: Error }
    | { status: 'saving'; data: T }
    | { status: 'saved'; data: T }

interface Storable {
    tableName: string
    load(): void
}

const all_tables = new Set<string>()

/// decorator
export function persistedObservable(options: PersistedOpts) {
    check(!all_tables.has(options.tableName), `duplicate table name: ${options.tableName}`)
    all_tables.add(options.tableName)
    return function <T extends { new (...args: any[]): Storable }>(constructor: T) {
        return class extends constructor {
            constructor(...args: any[]) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                super(...args)
                this.tableName = options.tableName
                this.load()
            }
            static tableName = options.tableName
        }
    }
}

export class PersistedObservable<T extends Identifiable>
    extends Observable<PersistedModel<T>>
    implements Storable
{
    private readonly store: Store
    tableName: string = ''
    readonly loadPriority: LoadPriority
    readonly id: string

    // must be called in a store transaction
    constructor(initialValue: T, store: Store, loadPriority: LoadPriority = LoadPriority.low) {
        super({ status: 'loading', data: initialValue })
        this.id = initialValue.id
        this.loadPriority = loadPriority
        this.store = store
    }

    load() {
        check(this.value.status === 'loading', 'already loaded')
        this.store.load(
            this.tableName,
            this.id,
            this.loadPriority,
            (data?: T) => {
                super.set({ status: 'loaded', data: data ?? this.data })
            },
            (error: Error) => {
                super.set({ status: 'error', data: this.data, error })
            },
            async () => {
                await this.onLoaded()
            },
        )
    }

    get data(): T {
        return this.value.data
    }

    set(_: PersistedModel<T>) {
        throw new Error('use update method to update')
    }

    // must be called in a store transaction
    update(data: T) {
        check(isDefined(data), 'value is undefined')
        check(data.id === this.id, 'id mismatch')
        super.set({ status: 'saving', data: data })
        this.store
            .withTransaction(`update-${this.tableName}:${this.id}`, () => {
                this.store.save(
                    this.tableName,
                    data,
                    () => {
                        super.set({ status: 'saved', data: data })
                    },
                    (e) => {
                        super.set({ status: 'error', data: data, error: e })
                    },
                    async () => {
                        await this.onSaved()
                    },
                )
            })
            .catch((e) => {
                super.set({ status: 'error', data: this.data, error: e })
            })
    }

    protected async onLoaded() {
        // abstract
        return Promise.resolve()
    }

    protected async onSaved() {
        // abstract
        return Promise.resolve()
    }
}
