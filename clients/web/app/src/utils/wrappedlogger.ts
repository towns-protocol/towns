import { Logger, pino } from 'pino'
import stringify from 'json-stringify-safe'

export class BufferedLogger {
    private buffer: CircularBuffer<unknown>

    private consoleLogger = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
    }
    write = (args: unknown) => {
        this.buffer.enqueue(args)
    }

    private pinoLogger: Logger = pino({
        browser: {
            asObject: true,
            write: this.write,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    }).child({ session: crypto.randomUUID() })

    constructor(bufferSize: number) {
        this.buffer = new CircularBuffer(bufferSize)
    }
    private info(...args: unknown[]) {
        this.pinoLogger.info(args)
        this.consoleLogger.log(...args)
    }

    private warn(...args: unknown[]) {
        this.pinoLogger.warn(args)
        this.consoleLogger.warn(...args)
    }

    private debug(...args: unknown[]) {
        this.pinoLogger.debug(args)
        this.consoleLogger.debug(...args)
    }

    private error(...args: unknown[]) {
        this.pinoLogger.error(args)
        this.consoleLogger.error(...args)
    }

    public getBufferAsString() {
        return this.buffer.toString()
    }

    public getLogger() {
        return {
            info: this.info.bind(this),
            warn: this.warn.bind(this),
            debug: this.debug.bind(this),
            error: this.error.bind(this),
        }
    }
}

function stringifyReplacer(key: string, value: unknown) {
    if (typeof value === 'bigint') {
        return value.toString()
    }
    return value
}

class CircularBuffer<T> {
    private buffer: (T | null)[] = []
    private readonly _size: number
    private _count = 0
    private head = 0
    private tail = 0

    constructor(size: number) {
        this._size = size
        this._count = 0
        this.buffer = new Array(size).fill(null)
        this.head = 0
        this.tail = 0
    }

    public get size(): number {
        return this._size
    }

    public get count(): number {
        return this._count
    }

    public enqueue(item: T): void {
        this.buffer[this.tail] = item
        this.tail = (this.tail + 1) % this._size
        if (this._count === this._size) {
            this.head = (this.head + 1) % this._size
        } else {
            this._count++
        }
    }

    public dequeue(): T | null {
        if (this.isEmpty()) {
            return null
        }
        const item = this.buffer[this.head]
        this.buffer[this.head] = null
        this.head = (this.head + 1) % this._size
        this._count--
        return item
    }

    public clear(): void {
        this.buffer = new Array(this._size).fill(null)
        this._count = 0
        this.head = 0
        this.tail = 0
    }

    public isEmpty(): boolean {
        return this._count === 0
    }

    public isFull(): boolean {
        return this._count === this._size
    }

    public toString(): string {
        const delimiter = ',\n'
        let result = '[' + (this.count > 0 ? '\n' : '')
        for (let i = 0; i < this.count; i++) {
            const index = (this.head + i) % this.size
            if (this.buffer[index] !== null) {
                result += stringify(this.buffer[index], stringifyReplacer)
                if (result && i < this.count - 1) {
                    result += delimiter
                }
            }
        }
        result += (this.count > 0 ? '\n' : '') + ']'
        return result
    }
}

export const bufferedLogger = new BufferedLogger(500)
