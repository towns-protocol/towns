import tracer from 'dd-trace'

import { config } from './environment'

// initialized in a different file to avoid hoisting and bundling issues.

if (config.apm.tracingEnabled) {
	tracer.init({
		service: 'stream-metadata',
		env: config.apm.environment,
		profiling: config.apm.profilingEnabled,
		logInjection: true,
		version: config.version,
	})
}

// eslint-disable-next-line import/no-default-export
export default tracer
