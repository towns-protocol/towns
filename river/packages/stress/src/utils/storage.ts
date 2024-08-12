import { dlogger } from '@river-build/dlog'
import Redis from 'ioredis'

const logger = dlogger('stress:storage')

export interface IStorage {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    remove(key: string): Promise<void>
    close(): Promise<void>
}

function parseRedisUrl(uri: string) {
    const defaultRedisPort = 6379
    try {
        const url = new URL(uri)
        const host = `${url.protocol}//${url.hostname}`
        const port = url.port.length > 0 ? parseInt(url.port) : defaultRedisPort
        const opts = host.includes('localhost') ? { port } : { host, port }
        return opts
    } catch (error) {
        return { host: uri, port: defaultRedisPort }
    }
}

export class RedisStorage implements IStorage {
    private client: Redis

    constructor(uri: string) {
        const opts = parseRedisUrl(uri)
        logger.log('New Redis connection', opts)
        this.client = new Redis(opts)
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
