export class Observable<T> {
    subscribers: ((value: T) => void)[] = []
    private _value: T

    constructor(value: T) {
        this._value = value
    }

    get value(): T {
        return this._value
    }

    set(value: T) {
        this._value = value
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
