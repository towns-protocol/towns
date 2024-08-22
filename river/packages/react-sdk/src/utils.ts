import type { PersistedModel } from '@river-build/sdk'

export const isPersistedModel = <T>(value: T | PersistedModel<T>): value is PersistedModel<T> => {
    if (typeof value !== 'object') {
        return false
    }
    if (value === null) {
        return false
    }
    return 'status' in value && 'data' in value
}
