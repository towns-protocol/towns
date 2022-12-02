import dotenv from 'dotenv'

dotenv.config()

export const config = {
    port: +(process.env.PORT ?? '7104'),
    redisUrl: process.env.REDIS_URL ?? 'redis://default:redispw@localhost:55000',
    postgresUrl:
        process.env.POSTGRES_URL ?? 'postgresql://postgres:postgres@localhost:5433/casablanca',
    testRemoteUrl: process.env.TEST_REMOTE_URL,
    storageType: process.env.STORAGE_TYPE ?? 'postgres',
}
