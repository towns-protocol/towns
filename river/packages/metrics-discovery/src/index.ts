import fs from 'fs'
import { MetricsDiscovery } from './metrics-discovery'
import { envVarsSchema } from './env-vars'
import { sleep } from './utils'
import { createPrometheusConfig } from './create-prometheus-config'
import http from 'node:http'

const PROMETHEUS_TARGETS_FILE = './prometheus/etc/targets.json'
const SLEEP_DURATION_MS = 1000 * 60 * 5 // 5 minutes
const PORT = 8080

let numWrites = 0

const run = async () => {
    console.info('Creating prometheus config...')
    await createPrometheusConfig()
    console.info('Prometheus config created')

    const envVars = envVarsSchema.parse(process.env)
    const metricsDiscovery = MetricsDiscovery.init({
        riverRpcURL: envVars.RIVER_RPC_URL,
        env: envVars.ENV,
    })

    const server = http.createServer((req, res) => {
        if (numWrites === 0) {
            res.writeHead(500, { 'Content-Type': 'text/plain' })
            res.end('No prometheus targets written yet\n')
            return
        } else {
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('Healthy\n')
        }
    })

    server.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/`)
    })

    for (;;) {
        console.info('Getting prometheus targets...')
        const targets = await metricsDiscovery.getPrometheusTargets()
        console.info('Writing prometheus targets...', targets)
        await fs.promises.writeFile(PROMETHEUS_TARGETS_FILE, targets, {
            encoding: 'utf8',
        })
        numWrites++
        console.info(`Prometheus targets written to: ${PROMETHEUS_TARGETS_FILE}`)
        console.info(`Sleeping for ${SLEEP_DURATION_MS} ms...`)
        await sleep(SLEEP_DURATION_MS)
    }
}

run().catch(console.error)
