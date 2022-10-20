import { EventStore } from './eventStore'
import { initStorage } from './storage'
import { RedisEventStore } from './redisEventStore'

import debug from 'debug'
import { findLastIndex, truncate } from 'lodash'

const log = debug('test:RedisEventStore')

describe('initStorage', () => {
    let store: EventStore

    afterAll(async () => {
        if (store) {
            await store.close()
        }
    })

    test('initStorageRedis', async () => {
        store = initStorage('redis')
        expect(store instanceof RedisEventStore).toEqual(true)
    })

    // TODO - figure out why this test doesn't work
    // test('initStorageUnsupported', async () => {
    //     expect(initStorage('mysql')).toThrow('No supported storageType found')
    // })
})
