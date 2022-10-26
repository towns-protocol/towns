import { PGEventStore } from './pgEventStore'
import { RedisEventStore } from './redisEventStore'

export const initStorage = (storageType: string) => {
    if (storageType == 'redis') {
        return new RedisEventStore()
    } else if (storageType == 'postgres') {
        return new PGEventStore()
    }
    throw new Error('No supported storageType found')
}

export type Storage = ReturnType<typeof initStorage>
