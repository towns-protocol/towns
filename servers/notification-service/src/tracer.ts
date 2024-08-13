import tracer from 'dd-trace'

// initialized in a different file to avoid hoisting and bundling issues.

// we specifically don't use zod-validated env vars here, because we want this file to be the first thing that runs.

if (process.env.TRACING_ENABLED === 'true') {
    tracer.init({
        service: 'notification-service',
        env: process.env.RIVER_ENV,
        profiling: process.env.PROFILING_ENABLED === 'true',
        logInjection: true,
        version: process.env.DD_GIT_COMMIT_SHA?.substring(0, 7),
    })
}

export default tracer
