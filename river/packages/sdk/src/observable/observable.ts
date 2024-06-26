export class Observable<T> {
    protected subscribers: ((value: T) => void)[] = []
    protected _value: T

    constructor(value: T) {
        this._value = value
    }

    get value(): T {
        return this._value
    }

    setValue(newValue: T) {
        this._value = newValue
        this.notify()
    }

    subscribe(subscriber: (newValue: T) => void, opts: { fireImediately?: boolean } = {}): this {
        this.subscribers.push(subscriber)
        if (opts.fireImediately) {
            subscriber(this.value)
        }
        return this
    }

    unsubscribe(subscriber: (value: T) => void) {
        this.subscribers = this.subscribers.filter((sub) => sub !== subscriber)
    }

    private notify() {
        this.subscribers.forEach((sub) => sub(this.value))
    }
}
