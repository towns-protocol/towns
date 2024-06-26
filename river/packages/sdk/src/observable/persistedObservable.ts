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

interface Storable {}

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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                ;(this as any).tableName = options.tableName
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
    private tableName: string = ''
    private readonly store: Store
    private readonly loadPriority: LoadPriority

    // must be called in a store transaction
    constructor(initialValue: T, store: Store, loadPriority: LoadPriority = LoadPriority.low) {
        super({ status: 'loading', data: initialValue })
        this.loadPriority = loadPriority
        this.store = store
    }

    protected load() {
        check(super.value.status === 'loading', 'already loaded')
        this.store.load(
            this.tableName,
            this.data.id,
            this.loadPriority,
            (data?: T) => {
                super.setValue({ status: 'loaded', data: data ?? this.data })
            },
            (error: Error) => {
                super.setValue({ status: 'error', data: this.data, error })
            },
            async () => {
                await this.onLoaded()
            },
        )
    }

    override get value(): PersistedModel<T> {
        return super.value
    }

    override setValue(_newValue: PersistedModel<T>) {
        throw new Error('use updateData instead of set value')
    }

    get data(): T {
        return super.value.data
    }

    // must be called in a store transaction
    setData(newDataPartial: Partial<T>) {
        check(isDefined(newDataPartial), 'value is undefined')
        const newData = { ...this.data, ...newDataPartial }
        check(newData.id === this.data.id, 'id mismatch')
        super.setValue({ status: 'saving', data: newData })
        this.store
            .withTransaction(`update-${this.tableName}:${this.data.id}`, () => {
                this.store.save(
                    this.tableName,
                    newData,
                    () => {
                        super.setValue({ status: 'saved', data: newData })
                    },
                    (e) => {
                        super.setValue({ status: 'error', data: newData, error: e })
                    },
                    async () => {
                        await this.onSaved()
                    },
                )
            })
            .catch((e) => {
                super.setValue({ status: 'error', data: this.data, error: e })
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
