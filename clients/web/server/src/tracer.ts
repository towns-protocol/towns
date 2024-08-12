// tracer.ts
import tracer from 'dd-trace'
import { config } from './config'

// initialized in a different file to avoid hoisting and bundling issues.

let env = config.VITE_RIVER_ENV
let tracingEnabled = config.TRACING_ENABLED && !config.IS_PULL_REQUEST

// We don't want tracing for every single PR, but in case we do, we can add `FORCE_ENABLE_TRACING=true` to the PR's env vars.

if (config.FORCE_ENABLE_TRACING) {
    console.log('Forcing enable tracing')

    tracingEnabled = true
    env = `pr-${config.VITE_GITHUB_PR_NUMBER}`
}

if (tracingEnabled) {
    tracer.init({
        service: 'towns-fastify-server',
        env,
        profiling: config.PROFILING_ENABLED,
        logInjection: true,
        hostname: config.DD_AGENT_HOST,
    })
} else {
    console.log('Tracing disabled')
}

export default tracer
