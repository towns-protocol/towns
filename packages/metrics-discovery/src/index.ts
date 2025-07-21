import fs from 'fs'
import { MetricsDiscovery } from './metrics-discovery'
import { sleep } from './utils'
import { createPrometheusConfig } from './create-prometheus-config'
import http from 'node:http'
import { getLogger } from './logger'
import { config } from './config'

const PROMETHEUS_TARGETS_FILE = './prometheus/etc/targets.json'
const SLEEP_DURATION_MS = 1000 * 60 * 5 // 5 minutes
const PORT = 8080

let numWrites = 0

const logger = getLogger('metrics-discovery')

const run = async () => {
    logger.info('Creating prometheus config...')
    await createPrometheusConfig()
    logger.info('Prometheus config created')

    const metricsDiscovery = MetricsDiscovery.init({
        riverRpcURL: config.riverRpcURL,
        env: config.env,
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
        logger.info(`Server running at http://localhost:${PORT}/`)
    })

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            logger.info('Getting prometheus targets...')
            const targets = await metricsDiscovery.getPrometheusTargets()
            logger.info({ targets }, 'Writing prometheus targets...')
            await fs.promises.writeFile(PROMETHEUS_TARGETS_FILE, targets, {
                encoding: 'utf8',
            })
            numWrites++
            logger.info(
                {
                    file: PROMETHEUS_TARGETS_FILE,
                },
                `Prometheus targets written`,
            )
        } catch (e) {
            logger.error({ error: e }, 'Error writing prometheus targets:')
        } finally {
            logger.info({ durationMs: SLEEP_DURATION_MS }, `Sleeping...`)
            await sleep(SLEEP_DURATION_MS)
        }
    }
}
run().catch(logger.error)
