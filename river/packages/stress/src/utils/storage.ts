import Redis from 'ioredis'
import { getLogger } from './logger'

const logger = getLogger('stress:storage')

export interface IStorage {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    remove(key: string): Promise<void>
    close(): Promise<void>
}

export class RedisStorage implements IStorage {
    private client: Redis

    constructor(host: string, port?: number) {
        this.client = new Redis({ host, port: port ?? 6379 })
    }
    async get(key: string): Promise<string | null> {
        try {
            const r = await this.client.get(key)
            return r
        } catch (error) {
            logger.error({ error, key }, `Failed to get key`)
            return null
        }
    }
    async set(key: string, value: string): Promise<void> {
        try {
            await this.client.set(key, value)
        } catch (error) {
            logger.error({ error, key, value }, `Failed to set key/value`)
        }
    }
    async remove(key: string): Promise<void> {
        try {
            await this.client.del(key)
        } catch (error) {
            logger.error({ error, key }, `Failed to remove key`)
        }
    }

    async close() {
        try {
            await this.client.quit()
        } catch (error) {
            logger.error({ error }, 'Failed to close Redis connection')
        }
    }
}
