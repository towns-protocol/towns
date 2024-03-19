import * as winston from 'winston'
import { isProduction } from './utils/environment'

let format = winston.format.combine(winston.format.timestamp(), winston.format.json())
if (!isProduction) {
    format = winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf((info) => {
            return `${info.timestamp} ${info.level}: ${info.message}`
        }),
    )
}

export const logger = winston.createLogger({
    level: 'info',
    exitOnError: false,
    format,
    transports: [new winston.transports.Console()],
})
