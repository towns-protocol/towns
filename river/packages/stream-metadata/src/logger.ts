import { pino } from 'pino'
import { FastifyBaseLogger } from 'fastify'

import { config } from './environment'

const pretty = {
	target: 'pino-pretty',
	options: {
		colorize: true,
		colorizeObjects: true,
	},
}

const baseLogger = pino({
	transport: config.log.pretty ? pretty : undefined,
	level: config.log.level,
})

export function getLogger(name: string, meta: Record<string, unknown> = {}) {
	return baseLogger.child({ name, ...meta })
}

export function getFunctionLogger(logger: FastifyBaseLogger, functionName: string) {
	return logger.child({ functionName })
}
