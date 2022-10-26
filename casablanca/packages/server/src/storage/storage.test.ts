import { EventStore } from './eventStore'
import { initStorage } from './storage'
import { RedisEventStore } from './redisEventStore'
import { PGEventStore } from './pgEventStore'

import debug from 'debug'

const log = debug('test:RedisEventStore')

describe('initStorage', () => {
    test('initStorageRedis', async () => {
        const redis = initStorage('redis')
        expect(redis instanceof RedisEventStore).toEqual(true)
        await redis.close()
    })

    test('initStoragePG', async () => {
        const postgres = initStorage('postgres')
        expect(postgres instanceof PGEventStore).toEqual(true)
        await postgres.close()
    })

    // TODO - figure out why this test doesn't work
    // test('initStorageUnsupported', async () => {
    //     expect(initStorage('mysql')).toThrow('No supported storageType found')
    // })
})
