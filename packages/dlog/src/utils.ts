export const isBrowser =
    typeof window !== 'undefined' && typeof window.document !== 'undefined'

export const isNodeEnv =
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null

export function isTestEnv(): boolean {
    return (
        isNodeEnv &&
        (process.env.NODE_ENV === 'test' ||
            process.env.JEST_WORKER_ID !== undefined ||
            process.env.TS_JEST === '1')
    )
}
