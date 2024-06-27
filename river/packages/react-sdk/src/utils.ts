import type { PersistedModel } from '@river-build/sdk'

export const isPersistedModel = <T>(data: T | PersistedModel<T>): data is PersistedModel<T> => {
    if (typeof data === 'object' && data !== null) {
        return 'status' in data
    }
    return false
}
