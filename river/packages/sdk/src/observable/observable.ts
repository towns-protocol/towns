interface Subscription<T> {
    id: number
    fn: (value: T) => void
    condition: (value: T) => boolean
    once: boolean
}

export class Observable<T> {
    private _nextId = 0
    protected subscribers: Subscription<T>[] = []
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

    subscribe(
        subscriber: (newValue: T) => void,
        opts: { fireImediately?: boolean; once?: boolean; condition?: (value: T) => boolean } = {},
    ): () => void {
        const sub = {
            id: this._nextId++,
            fn: subscriber,
            once: opts?.once ?? false,
            condition: opts?.condition ?? (() => true),
        } satisfies Subscription<T>
        this.subscribers.push(sub)
        if (opts.fireImediately) {
            this._notify(sub, this.value)
        }
        return () => this.unsubscribe(subscriber)
    }

    when(
        condition: (value: T) => boolean,
        opts: { timeoutMs: number; description?: string } = { timeoutMs: 5000 },
    ): Promise<T> {
        const logId = opts.description ? ` ${opts.description}` : ''
        const timeoutError = new Error(`Timeout waiting for condition${logId}`)
        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                reject(timeoutError)
            }, opts.timeoutMs)
            this.subscribe(
                (value) => {
                    clearTimeout(timeoutHandle)
                    resolve(value)
                },
                { fireImediately: true, condition: condition, once: true },
            )
        })
    }

    unsubscribe(subscriber: (value: T) => void) {
        this.subscribers = this.subscribers.filter((sub) => sub.fn !== subscriber)
    }

    private notify() {
        const subscriptions = this.subscribers
        subscriptions.forEach((sub) => this._notify(sub, this.value))
    }

    private _notify(sub: Subscription<T>, value: T) {
        if (sub.condition(value)) {
            sub.fn(value)
            if (sub.once) {
                this.subscribers = this.subscribers.filter((s) => s !== sub)
            }
        }
    }
}
