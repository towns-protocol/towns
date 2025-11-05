import fs from 'fs'

const PROMETHEUS_CONFIG_FILE_SOURCE = './prometheus.yml'
const PROMETHEUS_CONFIG_FILE_DESTINATION = './prometheus/etc/prometheus.yml'

export const createPrometheusConfig = async () => {
    // eslint-disable-next-line no-console
    console.info('Creating prometheus config...')
    const prometheusConfig = await fs.promises.readFile(PROMETHEUS_CONFIG_FILE_SOURCE, {
        encoding: 'utf8',
    })
    await fs.promises.writeFile(PROMETHEUS_CONFIG_FILE_DESTINATION, prometheusConfig, {
        encoding: 'utf8',
    })
    // eslint-disable-next-line no-console
    console.info(`Prometheus config written to: ${PROMETHEUS_CONFIG_FILE_DESTINATION}`)
}
