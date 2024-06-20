import { check } from '@river-build/dlog'
import { Observable } from './observable'
import { LoadPriority, Store, Identifiable } from '../store/store'
import { isDefined } from '../check'

export interface PersistedOpts {
    tableName: string
    loadPriority: LoadPriority
}

export type PersistedModel<T> =
    | { status: 'loading'; data: T }
    | { status: 'loaded'; data: T }
    | { status: 'error'; data: T; error: Error }
    | { status: 'saving'; data: T }
    | { status: 'saved'; data: T }

interface Storable {
    tableName: string
    loadPriority: LoadPriority
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
                this.loadPriority = options.loadPriority
                check(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    isDefined((this as any).load),
                    'missing load method, please inherit from a PersistedObservable class',
                )
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                ;(this as any).load()
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
    loadPriority: LoadPriority = LoadPriority.low
    readonly id: string

    // must be called in a store transaction
    constructor(initialValue: T, store: Store) {
        super({ status: 'loading', data: initialValue })
        this.id = initialValue.id
        this.store = store
    }

    protected load() {
        this.store.load(
            this.tableName,
            this.id,
            this.loadPriority,
            async (data?: T) => {
                super.set({ status: 'loaded', data: data ?? this.data })
                await this.onLoaded()
            },
            async (error: Error) => {
                super.set({ status: 'error', data: this.data, error })
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
                    async () => {
                        super.set({ status: 'saved', data: data })
                        await this.onSaved()
                    },
                    async (e) => {
                        super.set({ status: 'error', data: data, error: e })
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
