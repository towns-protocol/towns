import { createLogger as winstonCreateLogger } from '../logger'

export function createLogger(label: string) {
    return winstonCreateLogger(`serviceMonitor:${label}`)
}
