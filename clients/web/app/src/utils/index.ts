export * from './environment'
export * from './debug'

export const EVERYONE_ADDRESS = '0x0000000000000000000000000000000000000001'

export function waitFor(
    predicate: () => boolean,
    maxWaitTimeMs: number,
    intervalMs = 100,
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const startTime = Date.now()

        const checkPredicate = () => {
            if (predicate()) {
                resolve()
            } else if (Date.now() - startTime >= maxWaitTimeMs) {
                reject(
                    new Error('Timeout: Predicate did not become true within the specified time.'),
                )
            } else {
                setTimeout(checkPredicate, intervalMs)
            }
        }
        checkPredicate()
    })
}
