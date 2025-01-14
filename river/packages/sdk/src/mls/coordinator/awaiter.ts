export interface IAwaiter {
    promise: Promise<void>
    resolve: () => void
}

export class NoopAwaiter implements IAwaiter {
    public promise = Promise.resolve()
    public resolve = () => {}
}

export class IndefiniteAwaiter implements IAwaiter {
    public promise: Promise<void>
    public resolve!: () => void

    public constructor() {
        this.promise = new Promise((resolve) => {
            this.resolve = resolve
        })
    }
}

export class TimeoutAwaiter implements IAwaiter {
    // top level promise
    public promise: Promise<void>
    // resolve handler to the inner promise
    public resolve!: () => void
    public constructor(timeoutMS: number, msg: string = 'Awaiter timed out') {
        let timeout: NodeJS.Timeout
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(() => {
                reject(new Error(msg))
            }, timeoutMS)
        })
        const internalPromise: Promise<void> = new Promise(
            (resolve: (value: void) => void, _reject) => {
                this.resolve = () => {
                    resolve()
                }
            },
        ).finally(() => {
            clearTimeout(timeout)
        })
        this.promise = Promise.race([internalPromise, timeoutPromise])
    }
}
