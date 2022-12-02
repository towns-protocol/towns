import { initStorage } from './storage'
import { RedisEventStore } from './redisEventStore'
import { PGEventStore } from './pgEventStore'

/**
 * @group explicit-storage
 */
describe('initStorage', () => {
    test('initStorageRedis', async () => {
        const redis = initStorage('redis')
        expect(redis).toBeInstanceOf(RedisEventStore)
        await redis.close()
    })

    test('initStoragePG', async () => {
        const postgres = initStorage('postgres')
        expect(postgres).toBeInstanceOf(PGEventStore)
        await postgres.close()
    })

    test('initStorageUnsupported', async () => {
        expect(() => {
            initStorage('mysql')
        }).toThrow()
    })
})
