import debug from 'debug'
import { config } from '../config'
import { PGEventStore } from './pgEventStore'
import { RedisEventStore } from './redisEventStore'

const log = debug('zion:storage')

export const initStorage = (storageType?: string) => {
    if (storageType === undefined) {
        storageType = config.storageType
        log('Using storage type from config:', storageType)
    } else {
        log('Using explicit storage type, config ignored:', storageType)
    }
    if (storageType === 'redis') {
        return new RedisEventStore()
    } else if (storageType === 'postgres') {
        return new PGEventStore()
    }
    throw new Error('No supported storageType found')
}

export type Storage = ReturnType<typeof initStorage>
