import { pino } from 'pino'

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

export const getLogger = (name: string, meta: Record<string, unknown> = {}) =>
	baseLogger.child({ name, ...meta })
