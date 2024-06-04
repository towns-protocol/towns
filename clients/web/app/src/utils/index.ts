import sortBy from 'lodash/sortBy'
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

export function findLocalStorageKeys(pattern: RegExp | string): string[] {
    const keys = Object.keys(localStorage)
    const matchingKeys: string[] = []

    if (pattern instanceof RegExp) {
        for (const key of keys) {
            if (pattern.test(key)) {
                matchingKeys.push(key)
            }
        }
    } else if (typeof pattern === 'string') {
        for (const key of keys) {
            if (key.includes(pattern)) {
                matchingKeys.push(key)
            }
        }
    } else {
        throw new Error('Invalid input. Please provide a valid RegExp or string.')
    }

    return matchingKeys
}

export const getDraftDMStorageId = (userIds?: string[]) =>
    `draft-dm-input-${sortBy(userIds || []).join('-')}`
