import { createLogger as wintonCreateLogger } from '../logger'

export function createLogger(label: string) {
    return wintonCreateLogger(`serviceMonitor:${label}`)
}
