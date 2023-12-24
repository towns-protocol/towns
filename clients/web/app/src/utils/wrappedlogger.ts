import { Logger, pino } from 'pino'

export class BufferedLogger {
    private bufferSize: number
    private buffer: object[] = []

    private initalLoggers = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
    }
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    write = (record: object) => {
        while (this.buffer.length >= this.bufferSize) {
            this.buffer.shift()
        }
        this.buffer.push(record)
    }

    private logger: Logger = pino({ browser: { asObject: true, write: this.write } })

    constructor(bufferSize: number) {
        this.buffer = []
        this.bufferSize = bufferSize
    }

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private info(msg?: string, ...args: any[]) {
        this.logger.info(msg ? msg : '', args)
        this.initalLoggers.log(msg ? msg : '', args)
    }

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private warn(msg?: string, ...args: any[]) {
        this.logger.warn(msg ? msg : '', args)
        this.initalLoggers.warn(msg ? msg : '', args)
    }

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private debug(msg?: string, ...args: any[]) {
        this.logger.debug(msg ? msg : '', args)
        this.initalLoggers.debug(msg ? msg : '', args)
    }

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private error(msg?: string, ...args: any[]) {
        this.logger.error(msg ? msg : '', args)
        this.initalLoggers.error(msg ? msg : '', args)
    }

    public getBufferAsString(limit = 100000) {
        return JSON.stringify(this.buffer).substring(0, limit)
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
