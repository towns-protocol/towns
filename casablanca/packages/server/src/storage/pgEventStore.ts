import type { FullEvent, StreamAndCookie, StreamsAndCookies, SyncPos } from '@zion/core'
import { Err, throwWithCode } from '@zion/core'
import debug from 'debug'
import pg, { Notification, PoolClient } from 'pg'
import format, { string } from 'pg-format'
import { setTimeout as setTimeoutWithPromise } from 'timers/promises'
import { config } from '../config'
import { EventStore } from './eventStore'

const log = debug('zion:PGEventStore')

function createPGPool() {
    return new pg.Pool({
        max: 1000, // TODO - make this configurable, needed to be larger then 10 to get the tests to pass
        connectionString: config.postgresUrl,
        application_name: 'casablanca_server',
    })
}

const PG_EVENT_TABLE_NAME_PREFIX = 'es_'
const closedFlag = 'closedFlag' as const
const timeoutFlag = 'timeoutFlag' as const

async function pgListen(streamIds: string[], client: PoolClient) {
    log('pgListen', streamIds)
    let queryString = ''
    streamIds.forEach((streamId) => {
        // TODO - limit the size of this query
        queryString += format('LISTEN %I;', 'newevent_' + PG_EVENT_TABLE_NAME_PREFIX + streamId)
    })
    await client.query(queryString)
}

async function pgUnlisten(streamIds: string[], client: PoolClient) {
    log('pgUnlisten', streamIds)
    let queryString = ''
    streamIds.forEach((streamId) => {
        // TODO - limit the size of this query
        queryString += format('UNLISTEN %I;', 'newevent_' + PG_EVENT_TABLE_NAME_PREFIX + streamId)
    })
    await client.query(queryString)
}

async function tableExists(streamId: string, client: PoolClient): Promise<boolean> {
    const tableName = PG_EVENT_TABLE_NAME_PREFIX + streamId
    log('tableExists start', tableName)

    const result = await client.query({
        name: 'table-exists',
        text: `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            where    table_name   = $1
            )`,
        values: [tableName],
    })
    log('tableExists end', tableName, result.rows[0].exists)
    return result.rows[0].exists
}

async function createStreamTable(streamId: string, client: PoolClient) {
    const tableName = PG_EVENT_TABLE_NAME_PREFIX + streamId

    // TODO - do we need try catch here? maybe better to just let the except bubble up
    log('createStreamTable', 'creating table:', tableName)
    await client.query(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      seq_num BIGSERIAL,
      data TEXT NOT NULL
    );
    CREATE TRIGGER new_event_trigger AFTER INSERT ON "${tableName}" FOR EACH ROW EXECUTE PROCEDURE notify_newevent();
  `)
    log('createStreamTable', 'table created:', tableName)
}

async function withConnection<T>(
    pool: pg.Pool,
    thunk: (client: PoolClient) => Promise<T>,
): Promise<T> {
    const client = await pool.connect()
    try {
        const res = await thunk(client)
        client.release()
        return res
    } catch (err: any) {
        client.release(err)
        throw err
    }
}

// TODO: change throws to throwWithCode
export class PGEventStore implements EventStore {
    readonly pool: pg.Pool
    private closeResolver:
        | ((value: typeof closedFlag | PromiseLike<typeof closedFlag>) => void)
        | undefined = undefined
    readonly closePromise: Promise<typeof closedFlag>
    private closed = false
    constructor() {
        this.pool = createPGPool()
        this.closePromise = new Promise<typeof closedFlag>(async (resolve, reject) => {
            this.closeResolver = resolve
        })
    }

    async close(): Promise<void> {
        log('PGEventStore closing')
        this.closed = true
        this.closeResolver?.(closedFlag)
        await this.pool.end()
        log('PGEventStore closed')
    }

    private async addEventsImpl(
        streamId: string,
        events: FullEvent[],
        dbClient: PoolClient,
    ): Promise<string> {
        if (events.length <= 0) {
            throw new Error('Events must not be empty')
        }
        let seq_num: string | undefined = undefined

        log('addEventsImpl begin', { streamId, events })

        const tableName = PG_EVENT_TABLE_NAME_PREFIX + streamId
        const insertQuery = format(
            'INSERT INTO %I (data) VALUES %L RETURNING seq_num',
            tableName,
            events.map((event) => [JSON.stringify(event)]),
        )

        try {
            const ret = await dbClient.query(insertQuery)
            if (ret.rows.length === 0) {
                throw new Error('Failed to add events')
            }
            seq_num = string(ret.rows[ret.rows.length - 1].seq_num)
            return seq_num
        } catch (err: any) {
            log('addEventsImpl err', tableName, err)
            throw err
        } finally {
            log('addEventsImpl finally', { streamId, seq_num })
        }
    }

    /**
     *
     * @param streamId
     * @param inceptionEvents
     * @returns sync cookie for reading new events from the stream
     */
    async createEventStream(streamId: string, inceptionEvents: FullEvent[]): Promise<string> {
        return await withConnection(this.pool, async (dbClient) => {
            const exists = await tableExists(streamId, dbClient)
            if (!exists) {
                await createStreamTable(streamId, dbClient)
            }
            const result = await this.addEventsImpl(streamId, inceptionEvents, dbClient)
            await dbClient.query('COMMIT;')
            return result
        })
    }

    /**
     * get all event streams
     * @returns array of stream ids
     */
    async getEventStreams(): Promise<string[]> {
        return await withConnection(this.pool, async (dbClient) => {
            const query = `SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            AND table_name LIKE '${PG_EVENT_TABLE_NAME_PREFIX}%'`
            const result = await dbClient.query(query)

            return result.rows.map((row: any) =>
                row.table_name.slice(PG_EVENT_TABLE_NAME_PREFIX.length),
            )
        })
    }

    /**
     * @param streamId
     */
    async deleteEventStream(streamId: string): Promise<void> {
        log('deleteEventStream', streamId)
        await withConnection(this.pool, async (dbClient) => {
            const tableName = PG_EVENT_TABLE_NAME_PREFIX + streamId
            const query = `DROP TABLE IF EXISTS "${tableName}"`
            await dbClient.query(query)
        })
    }

    /**
     * delete all event stream tables
     * @returns array of stream ids
     */
    async deleteAllEventStreams(): Promise<string[]> {
        log('deleteAllEventStreams')
        const query = `SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE' 
            AND table_name LIKE '${PG_EVENT_TABLE_NAME_PREFIX}%'`
        try {
            const tables = await this.pool
                .query(query)
                .then((res) => res.rows.map((row) => row.table_name))

            for (const table of tables) {
                await this.deleteEventStream(table.slice(PG_EVENT_TABLE_NAME_PREFIX.length))
            }
            return tables
        } catch (err: any) {
            log('deleteAllEventStreams err', err)
            throw err
        }
    }

    /**
     *
     * @param streamId
     * @param events
     * @returns sync cookie for reading new events from the stream
     */
    async addEvents(streamId: string, events: FullEvent[]): Promise<string> {
        return await withConnection(this.pool, async (dbClient) => {
            const result = await this.addEventsImpl(streamId, events, dbClient)
            await dbClient.query('COMMIT;')
            return result
        })
    }

    async streamExists(streamId: string): Promise<boolean> {
        return await withConnection(this.pool, async (dbClient) => {
            const exists = await tableExists(streamId, dbClient)
            return exists
        })
    }

    async getEventStream(streamId: string): Promise<StreamAndCookie> {
        const tableName = PG_EVENT_TABLE_NAME_PREFIX + streamId
        // TODO - add pagination using LIMIT
        const query = {
            // give the query a unique name
            name: `fetch-all-events-${tableName}`.slice(0, 63),
            text: `SELECT * FROM "${tableName}" ORDER BY seq_num`,
        }

        try {
            const ret = await this.pool.query(query)
            if (ret.rows.length <= 0) {
                throwWithCode('Stream not found', Err.STREAM_NOT_FOUND)
            }
            const rows = ret.rows.map((item) => ({
                data: JSON.parse(item.data),
                seq_num: item.seq_num,
            }))
            log(
                `getEventStream`,
                rows.map((event) => ({ hash: event.data.hash, seq_num: event.seq_num })),
            )
            return {
                events: rows.map((event) => event.data),
                syncCookie: rows[rows.length - 1].seq_num,
            }
        } catch (err: any) {
            if (err.code == '42P01') {
                throwWithCode('Stream not found', Err.STREAM_NOT_FOUND)
            } else {
                log('getEventStream err', streamId, err)
                throw err
            }
        }
    }

    private makeOutput(
        queryResult: Record<string, any[]>,
        streamToOrigCookie: Record<string, string>,
    ): StreamsAndCookies {
        const finalOuput: StreamsAndCookies = {}
        const streamIds = Object.keys(queryResult)

        streamIds.forEach((streamId) => {
            const rows = queryResult[streamId]
            const syncCookie = rows[rows.length - 1].seq_num
            finalOuput[streamId] = {
                events: queryResult[streamId].map((item) => JSON.parse(item.data)),
                syncCookie: syncCookie,
                originalSyncCookie: streamToOrigCookie[streamId],
            }
        })

        log('makeOutput', finalOuput)
        return finalOuput
    }

    async readNewEvents(args: SyncPos[], timeousMs: number = 0): Promise<StreamsAndCookies> {
        if (args.length <= 0) {
            throw new Error('args must not be empty')
        }
        const streamToOrigCookie = args.reduce(function (map, obj) {
            map[obj.streamId] = obj.syncCookie
            return map
        }, {} as Record<string, string>)
        const streamIds = args.map((arg) => arg.streamId)
        const cookies = args.map((arg) => arg.syncCookie)
        log('readNewEvents', 'readArgs begin', timeousMs, ...streamIds, ...cookies)
        let cleanupdbClient: PoolClient | undefined = undefined
        let queryError: Error | undefined = undefined

        try {
            const queryResult: Record<string, any[]> = {}
            const notificationData: Notification[] = []

            const dbClient = await this.pool.connect()
            cleanupdbClient = dbClient
            let listenResolver: ((value: boolean | PromiseLike<boolean>) => void) | undefined =
                undefined
            const listenPromise = new Promise<boolean>(async (resolve, reject) => {
                listenResolver = resolve
                //create callback function
            })

            const handleNotificationData = function (notification: Notification): void {
                const channelName = notification.channel
                log('pgListen', 'notification received', channelName)
                notificationData.push(notification)
                if (listenResolver) {
                    listenResolver(true)
                }
            }

            dbClient.on('notification', handleNotificationData)
            await pgListen(streamIds, dbClient)
            await dbClient.query('COMMIT;')

            await Promise.all(
                streamIds.map(async (streamId, index) => {
                    // TODO - figure out how to query all tables at once or in batches. Maybe UNION?
                    const cookie = cookies[index]
                    const tableName = PG_EVENT_TABLE_NAME_PREFIX + streamId

                    const query = {
                        // give the query a unique name
                        name: `fetch-events-${tableName}`.slice(0, 63),
                        text: `SELECT * FROM "${tableName}" WHERE seq_num > $1 ORDER BY seq_num`,
                        values: [cookie],
                    }

                    const ret = await dbClient.query(query)
                    // TODO - handle subset of queries failure gracefully
                    if (ret.rows.length > 0) {
                        queryResult[streamId] = ret.rows
                    }
                }),
            )

            log(
                'readNewEvents',
                'queryResult',
                Object.keys(queryResult).length === 0
                    ? 'query returned no rows'
                    : 'query returned rows',
                Object.entries(queryResult).map((k, v) => ({ k, v })),
            )

            if (timeousMs > 0 && Object.keys(queryResult).length === 0) {
                const timeoutController = new AbortController()

                log('readNewEvents: parking for notification', streamIds, timeousMs)
                const result = await Promise.race([
                    this.closePromise,
                    listenPromise,
                    setTimeoutWithPromise(timeousMs, timeoutFlag, {
                        signal: timeoutController.signal,
                    }),
                ])
                log(
                    'readNewEvents',
                    'returned from parking',
                    `notificationData length ${notificationData.length}`,
                    result,
                )
                if (result !== timeoutFlag) {
                    // Cleanup the timeout timer
                    timeoutController.abort()
                }
                if (result === closedFlag) {
                    log('readNewEvents closed')
                    await pgUnlisten(streamIds, dbClient)
                    await dbClient.query('COMMIT;')
                    dbClient.off('notification', handleNotificationData)
                    return {}
                }
            }
            await pgUnlisten(streamIds, dbClient)
            await dbClient.query('COMMIT;')
            dbClient.off('notification', handleNotificationData)

            if (Object.keys(notificationData).length > 0) {
                await Promise.all(
                    notificationData.map(async (notification) => {
                        const channelName = notification.channel
                        const substr = 'newevent_' + PG_EVENT_TABLE_NAME_PREFIX
                        const streamId = channelName.substring(
                            channelName.indexOf(substr) + substr.length,
                        )

                        const cookie = streamToOrigCookie[streamId]
                        const tableName = PG_EVENT_TABLE_NAME_PREFIX + streamId
                        const query = {
                            // give the query a unique name
                            name: `fetch-events-${tableName}`.slice(0, 63),
                            text: `SELECT * FROM "${tableName}" WHERE seq_num > $1 ORDER BY seq_num`,
                            values: [cookie],
                        }
                        const ret = await dbClient.query(query)
                        log(
                            'readNewEvents',
                            'fetching notification',
                            tableName,
                            cookie,
                            ret.rows.length,
                        )

                        // TODO - handle subset of queries failure gracefully
                        if (ret.rows.length > 0) {
                            queryResult[streamId] = ret.rows
                        } else {
                            log('notificationData had a notificaiton with no new data')
                        }
                    }),
                )
            }
            return this.makeOutput(queryResult, streamToOrigCookie)
        } catch (err) {
            queryError = err as Error
            log('readNewEvents', 'error occurred', queryError)
            throw err
        } finally {
            cleanupdbClient?.release(queryError)
            log('readNewEvents', 'finally')
        }
    }
}
