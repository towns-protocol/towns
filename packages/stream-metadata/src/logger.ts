import { LoggerOptions, TransportSingleOptions, pino } from 'pino'

import { config } from './environment'

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
        instance: config.instance,
        version: config.version,
        ...meta,
    })
}
