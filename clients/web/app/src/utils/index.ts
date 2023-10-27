export * from './environment'
export * from './debug'

export const EVERYONE_ADDRESS = '0x0000000000000000000000000000000000000001'

export function waitFor<T>(
    predicate: () => Promise<T>,
    maxWaitTimeMs: number,
    intervalMs = 100,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const startTime = Date.now()

        const checkPredicate = async () => {
            const result = await predicate()
            if (result) {
                resolve(result)
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
