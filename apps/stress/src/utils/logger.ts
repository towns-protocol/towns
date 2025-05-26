import { LoggerOptions, TransportSingleOptions, pino } from 'pino'

const IS_DEV = process.env.NODE_ENV === 'development'

const config = {
    log: {
        pretty: IS_DEV,
        level: IS_DEV ? 'debug' : 'info',
    },
}

const pretty: TransportSingleOptions = {
    target: 'pino-pretty',
    options: {
        colorize: true,
        colorizeObjects: true,
    },
}

const pinoOptions: LoggerOptions = {
    transport: config.log.pretty ? pretty : undefined,
    level: config.log.level,
    formatters: {
        level(level) {
            return { level }
        },
    },
}

const baseLogger = pino(pinoOptions)

export function getLogger(name: string, meta: Record<string, unknown> = {}) {
    return baseLogger.child({
        name,
        sessionId: process.env.SESSION_ID,
        containerIndex: process.env.CONTAINER_INDEX,
        processIndex: process.env.PROCESS_INDEX,
        ...meta,
    })
}
