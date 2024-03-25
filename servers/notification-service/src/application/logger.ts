import * as winston from 'winston'
import { isProduction } from './utils/environment'

export function createLogger(label: string) {
    let format

    if (isProduction) {
        format = winston.format.combine(
            winston.format.label({ label }),
            winston.format.timestamp(),
            winston.format.json(),
        )
    } else {
        format = winston.format.combine(
            winston.format.label({ label }),
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf((info) => {
                const { timestamp, level, label, message, ...rest } = info
                return `${timestamp} [${label}] ${level}: ${message} ${
                    Object.keys(rest).length ? JSON.stringify(rest, null, 2) : ''
                }`
            }),
        )
    }

    return winston.createLogger({
        level: 'info',
        exitOnError: false,
        format,
        transports: [new winston.transports.Console()],
    })
}

export const logger = createLogger('notificationService')
