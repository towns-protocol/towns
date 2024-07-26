import { Logger, format, transports, createLogger as winstonCreateLogger } from 'winston'
import { env, isProduction } from './utils/environment'
import { Request, Response, NextFunction } from 'express'

function createLogger(label: string): Logger {
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

export const notificationServiceLogger = createLogger('notificationService')

// Needs to be installed after JSON parsing middleware
export function attachReqLogger(req: Request, res: Response, next: NextFunction) {
    let userId: string
    if ((req.method === 'POST' || req.method === 'PATCH') && req.body && req.body.userId) {
        userId = req.body.userId
    } else {
        userId = (req.headers['user-id'] as string) || 'unknown'
    }

    const requestId = req.headers['x-request-id'] || 'unknown'

    req.logger = notificationServiceLogger.child({ requestId, userId })
    next()
}
