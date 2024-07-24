import { Logger, format, transports, createLogger as winstonCreateLogger } from 'winston'
import { env, isProduction } from './utils/environment'

export function createLogger(label: string): Logger {
    const metadataFormat = format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label'],
    })
    const labelFormat = format.label({ label })
    const errorFormat = format.errors({ stack: true })

    const devTransport = new transports.Console({
        format: format.combine(
            labelFormat,
            metadataFormat,
            errorFormat,
            format.timestamp(),
            format.colorize(),
            format.align(),
            format.printf((info) => {
                const metadataString = info.metadata ? JSON.stringify(info.metadata, null, 2) : ''

                return `${info.timestamp} - ${info.level}:  [${info.label}]: ${info.message} ${metadataString}`
            }),
        ),
    })

    const prodTransport = new transports.Console({
        format: format.combine(
            labelFormat,
            metadataFormat,
            errorFormat,
            format.timestamp(),
            format.json(),
        ),
    })

    const logger = winstonCreateLogger({
        level: env.LOG_LEVEL,
        exitOnError: false,
    })

    if (isProduction) {
        logger.add(prodTransport)
    } else {
        logger.add(devTransport)
    }

    return logger
}

export function createSubLogger(parentLogger: Logger, subLabel: string): Logger {
    return parentLogger.child({
        defaultMeta: { label: `${parentLogger.defaultMeta.label}-${subLabel}` },
    })
}

export const notificationServiceLogger = createLogger('notificationService')
