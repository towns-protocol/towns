import { Logger, pino } from 'pino'
import stringify from 'json-stringify-safe'

export class BufferedLogger {
    private bufferSize: number
    private buffer: unknown[] = []

    private consoleLogger = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
    }
    write = (args: unknown) => {
        while (this.buffer.length >= this.bufferSize) {
            this.buffer.shift()
        }
        this.buffer.push(args)
    }

    private pinoLogger: Logger = pino({
        browser: {
            asObject: true,
            write: this.write,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    }).child({ session: crypto.randomUUID() })

    constructor(bufferSize: number) {
        this.buffer = []
        this.bufferSize = bufferSize
    }

    private info(...args: unknown[]) {
        this.pinoLogger.info(args)
        this.consoleLogger.log(args)
    }

    private warn(...args: unknown[]) {
        this.pinoLogger.warn(args)
        this.consoleLogger.warn(args)
    }

    private debug(...args: unknown[]) {
        this.pinoLogger.debug(args)
        this.consoleLogger.debug(args)
    }

    private error(...args: unknown[]) {
        this.pinoLogger.error(args)
        this.consoleLogger.error(args)
    }

    public getBufferAsString(limit = 100000) {
        let str = '[\n'
        for (let i = 0; i < this.buffer.length && str.length < limit; i++) {
            const delimiter = i === this.buffer.length - 1 ? '' : ',\n'
            str = str.concat('  ', stringify(this.buffer[i]), delimiter)
        }
        str = str.concat('\n]')
        return str
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

export const bufferedLogger = new BufferedLogger(400)
