import { dlogger } from '@river-build/dlog'
import Redis from 'ioredis'

const logger = dlogger('stress:storage')

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
            logger.error(`Failed to get key ${key}:`, error)
            return null
        }
    }
    async set(key: string, value: string): Promise<void> {
        try {
            await this.client.set(key, value)
        } catch (error) {
            logger.error(`Failed to set key ${key} with value ${value}:`, error)
        }
    }
    async remove(key: string): Promise<void> {
        try {
            await this.client.del(key)
        } catch (error) {
            logger.error(`Failed to remove key ${key}:`, error)
        }
    }

    async close() {
        try {
            await this.client.quit()
        } catch (error) {
            logger.error('Failed to close Redis connection:', error)
        }
    }
}
