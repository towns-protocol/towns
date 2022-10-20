import { RedisEventStore } from './redisEventStore'

export const initStorage = (storageType: string) => {
    if (storageType == 'redis') {
        return new RedisEventStore()
    }
    throw new Error('No supported storageType found')
}

export type Storage = ReturnType<typeof initStorage>
