import { isNode } from 'browser-or-node'

export function isNodeEnv(): boolean {
    return isNode
}

export function isJest(): boolean {
    return isNode && (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined)
}
