import { Observable } from './observable'

/// ObservableRecord is a class that implements an observable record.
/// the Record part is like a normal record
/// this class has a makeDefault function that provides the default value for a key
/// default values don't get added to the record, but they are cached
/// We're using WeakRef to store default values, allowing them to be garbage collected when unused
/// if the default value contains the streamId, you can pass makeDefault as a function
/// otherwise you can pass a static default value
/// in typscript it's assumed that all keys of Records have a value, even though that's obviously false
/// this class actually does always have a default value if you call get(...)
/// `makeDefault` is especially useful when you want consistent, per-key objects that can also be modified and stored back via `set(...)`.
export class ObservableRecord<
    KEY extends string | number | symbol,
    VALUE extends object,
> extends Observable<Record<KEY, VALUE | undefined>> {
    // weak reference cache of default values
    private defaultSource: { makeDefault: (key: KEY) => VALUE } | { defaultValue: VALUE }
    private defaultValues = new Map<KEY, WeakRef<VALUE>>()

    constructor(
        params:
            | { makeDefault: (key: KEY) => VALUE; initialValue?: Record<KEY, VALUE> }
            | { defaultValue: VALUE; initialValue?: Record<KEY, VALUE> },
    ) {
        super(params.initialValue ?? ({} as Record<KEY, VALUE>))
        this.defaultSource =
            'makeDefault' in params
                ? { makeDefault: params.makeDefault }
                : { defaultValue: params.defaultValue }
    }

    // For testing
    _cleanupNow() {
        for (const key of this.defaultValues.keys()) {
            if (this.defaultValues.get(key)?.deref() === undefined) {
                this.defaultValues.delete(key)
            }
        }
    }
    // every 100ish calls to makeDefault, we check if any default values are no longer needed
    // and remove them from the cache
    private maybeCleanup() {
        if (Math.random() < 0.01) {
            this._cleanupNow()
        }
    }

    // Return stable default values to avoid unnecessary React re-renders.
    // But allow GC to clean them up when unused.
    makeDefault(key: KEY): VALUE {
        // store default values in a weak reference cache
        // we want to return consistant values so that react components don't re-render
        // but once the value is no longer needed, we want to garbage collect it
        if ('defaultValue' in this.defaultSource) {
            return this.defaultSource.defaultValue
        } else {
            let defaultVal = this.defaultValues.get(key)?.deref()
            if (!defaultVal) {
                this.maybeCleanup()
                defaultVal = this.defaultSource.makeDefault(key)
                this.defaultValues.set(key, new WeakRef(defaultVal))
            }
            return defaultVal
        }
    }

    // return the value in the record or a default value for that key
    // the default value will be weakly cached so repeated calls will return the
    // same value as long as the value is not garbage collected
    get(key: KEY): VALUE {
        return this.value[key] ?? this.makeDefault(key)
    }

    // set a value for a specific key
    setValueFor(key: KEY, value: VALUE) {
        this.set((prev) => ({
            ...prev,
            [key]: value,
        }))
    }
}
