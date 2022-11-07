import dotenv from 'dotenv'

dotenv.config()

export const config = {
    port: +(process.env.PORT ?? '7104'),
    redisUrl: process.env.REDIS_URL ?? 'redis://default:redispw@localhost:55000',
    testRemoteUrl: process.env.TEST_REMOTE_URL,
    storageType: 'postgres', // TODO - pass this with env variable
}
