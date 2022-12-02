import {
    Err,
    FullEvent,
    StreamAndCookie,
    StreamsAndCookies,
    SyncPos,
    throwWithCode,
} from '@zion/core'
import debug from 'debug'
import _ from 'lodash'
import { config } from '../config'
import { EventStore } from './eventStore'
import { Pool, PoolClient } from 'pg'
import format, { string } from 'pg-format'
import { setTimeout as setTimeoutWithPromise } from 'timers/promises'

const log = debug('zion:PGEventStore')

export const createPGPool = () =>
    new Pool({
        connectionString: config.postgresUrl,
    })

const PG_EVENT_TABLE_NAME_PREFIX = 'es_'

// TODO: change throws to throwWithCode
export class PGEventStore implements EventStore {
    private pool: Pool
    constructor(pool?: Pool) {
        this.pool = pool ?? createPGPool()
    }

    async close(): Promise<void> {
        this.pool.end()
    }

    private async addEventsImpl(
        streamId: string,
        events: FullEvent[],
        newStream: boolean,
    ): Promise<string> {
        if (events.length <= 0) {
            throw new Error('Events must not be empty')
        }
        log('addEvents', 'streamId', streamId, 'events', events)

        const tableName = PG_EVENT_TABLE_NAME_PREFIX + streamId
        const insertQuery = format(
            'INSERT INTO %I (data) VALUES %L RETURNING seq_num',
            tableName,
            events.map((event) => [JSON.stringify(event)]),
        )

        const execInsert = async (): Promise<string> => {
            const ret = await this.pool.query(insertQuery)
            if (ret.rows.length === 0) {
                throw new Error('Failed to add events')
            }
            return ret.rows[ret.rows.length - 1].seq_num
        }

        try {
            return await execInsert()
        } catch (err: any) {
            if (err.code == '42P01') {
                // table does not exist
                log('addEvents', 'table does not exist:', tableName)
                if (newStream == false) {
                    throwWithCode('Stream not found', Err.STREAM_NOT_FOUND)
                }
                // TODO - figure out a better way to create table as this uses the existing PK seq which is shared
                let createQuery = format(
                    'CREATE TABLE %I (LIKE es_sample INCLUDING ALL);',
                    tableName,
                )
                createQuery += format(
                    'CREATE TRIGGER new_event_trigger AFTER INSERT ON %I FOR EACH ROW EXECUTE PROCEDURE notify_newevent();',
                    tableName,
                )
                // TODO - do we need try catch here? maybe better to just let the except bubble up
                await this.pool.query(createQuery)
                log('addEvents', 'table created:', tableName)
                return await execInsert()
            } else {
                throw err
            }
        }
    }

    /**
     *
     * @param streamId
     * @param inceptionEvents
     * @returns sync cookie for reading new events from the stream
     */
    async createEventStream(streamId: string, inceptionEvents: FullEvent[]): Promise<string> {
        return this.addEventsImpl(streamId, inceptionEvents, true)
    }

    /**
     *
     * @param streamId
     * @param events
     * @returns sync cookie for reading new events from the stream
     */
    async addEvents(streamId: string, events: FullEvent[]): Promise<string> {
        return this.addEventsImpl(streamId, events, false)
    }

    async streamExists(streamId: string): Promise<boolean> {
        const tableName = PG_EVENT_TABLE_NAME_PREFIX + streamId
        const query = format('SELECT 1 FROM %I LIMIT 1', tableName)
        try {
            const ret = await this.pool.query(query)
            return ret ? true : false
        } catch (err: any) {
            if (err.code == '42P01') {
                // table not exists error from PG
                return false
            } else {
                throw err
            }
        }
    }

    async getEventStream(streamId: string): Promise<StreamAndCookie> {
        const tableName = PG_EVENT_TABLE_NAME_PREFIX + streamId
        // TODO - add pagination using LIMIT
        const query = format('SELECT * FROM %I', tableName)
        try {
            const ret = await this.pool.query(query)
            if (ret.rows.length <= 0) {
                throwWithCode('Stream not found', Err.STREAM_NOT_FOUND)
            }
            return {
                events: ret.rows.map((item) => JSON.parse(item.data)),
                syncCookie: ret.rows[ret.rows.length - 1].seq_num,
            }
        } catch (err: any) {
            if (err.code == '42P01') {
                throwWithCode('Stream not found', Err.STREAM_NOT_FOUND)
            } else {
                throw err
            }
        }
    }

    private async pgListen(streamIds: string[], client: PoolClient) {
        log('pgListen', streamIds)
        let queryString = ''
        streamIds.forEach((streamId) => {
            // TODO - limit the size of this query
            queryString += format('LISTEN %I;', 'newevent_' + PG_EVENT_TABLE_NAME_PREFIX + streamId)
        })
        try {
            await client.query(queryString)
        } catch (e) {
            client.release()
            throw e
        }
    }

    private async pgUnlisten(client: PoolClient) {
        log('pgUnlisten', 'executing UNLISTEN *')
        // unlisten to all channels before releasing the client back to the pool
        try {
            await client.query('UNLISTEN *')
        } finally {
            // TODO - this is not great as this client instance keeps LISTENING even after release.
            // figure out a way to destroy this client instance
            client.release()
        }
    }

    private makeOutput(
        queryResult: any,
        notificationData: any[],
        reqStreamIds: string[],
        reqCookies: string[],
    ): Object {
        const finalOuput = Object()
        const notificationResults = Object()

        notificationData.forEach((item) => {
            const channelName = item.channel
            const substr = 'newevent_' + PG_EVENT_TABLE_NAME_PREFIX
            const streamId = channelName.substring(channelName.indexOf(substr) + substr.length)
            if (!(streamId in notificationResults)) {
                notificationResults[streamId] = []
            }
            notificationResults[streamId].push(JSON.parse(item.payload))
        })
        const streamIds = [
            ...new Set([...Object.keys(queryResult), ...Object.keys(notificationResults)]),
        ]

        streamIds.forEach((streamId) => {
            const allRows: any[] = []
            if (streamId in queryResult) {
                allRows.push(...queryResult[streamId])
            }
            if (streamId in notificationResults) {
                allRows.push(...notificationResults[streamId])
            }

            const uniqueRows = Array.from(new Set(allRows.map((a) => string(a.seq_num)))).map(
                (seq_num) => {
                    return allRows.find((a) => string(a.seq_num) === seq_num)
                },
            )

            uniqueRows.sort((a, b) => (a.seq_num < b.seq_num ? -1 : a.seq_num > b.seq_num ? 1 : 0))

            finalOuput[streamId] = {
                events: uniqueRows.map((item) => JSON.parse(item.data)),
                syncCookie: uniqueRows[uniqueRows.length - 1].seq_num,
                originalSyncCookie: reqCookies[reqStreamIds.indexOf(streamId)],
            }
        })

        return finalOuput
    }

    async readNewEvents(args: SyncPos[], timeousMs: number = 0): Promise<StreamsAndCookies> {
        if (args.length <= 0) {
            throw new Error('args must not be empty')
        }
        const streamIds = args.map((arg) => arg.streamId)
        const cookies = args.map((arg) => arg.syncCookie)
        log('readNewEvents', 'readArgs', ...streamIds, ...cookies)
        const queryResult = Object()
        let dbClient = Object()
        let queryFinished = false
        let listenPromise: Promise<boolean> | undefined
        let handleNotificationData: ((data: any) => Promise<void>) | undefined
        const notificationData: any[] = []

        var stopListening = async () => {
            dbClient.off('notification', handleNotificationData)
            await this.pgUnlisten(dbClient)
        }

        // start listening to streams if this is a long poll
        if (timeousMs > 0) {
            log('readNewEvents: starting long poll', streamIds)
            dbClient = await this.pool.connect()
            await this.pgListen(streamIds, dbClient)
            listenPromise = new Promise<boolean>(async (resolve, reject) => {
                //create callback function
                handleNotificationData = async function (data: any): Promise<void> {
                    log('pgListen', 'notification received', data)
                    notificationData.push(data)
                    if (queryFinished) {
                        resolve(true)
                    }
                }
            })
            dbClient.on('notification', handleNotificationData)
        }

        try {
            await Promise.all(
                streamIds.map(async (streamId, index) => {
                    // TODO - figure out how to query all tables at once or in batches. Maybe UNION?
                    const cookie = cookies[index]
                    const tableName = PG_EVENT_TABLE_NAME_PREFIX + streamId
                    const query = format('SELECT * FROM %I WHERE seq_num > %s', tableName, cookie)
                    const ret = await this.pool.query(query)
                    // TODO - handle subset of queries failure gracefully
                    if (ret.rows.length > 0) {
                        queryResult[streamId] = ret.rows
                    }
                }),
            )
        } catch (err) {
            // if a DB error happens, stopListening
            await stopListening()
            throw err
        }

        queryFinished = true

        if (timeousMs > 0) {
            if (Object.keys(queryResult).length > 0 || notificationData.length > 0) {
                await stopListening()
            } else {
                log('readNewEvents', 'starting wait timer')
                const ac = new AbortController()
                let result = await Promise.race([
                    listenPromise,
                    setTimeoutWithPromise(timeousMs, undefined, { signal: ac.signal }),
                ])
                await stopListening()
                if (result === undefined) {
                    log('readNewEvents', 'timeout occurred')
                } else {
                    // remove the settimeout
                    ac.abort()
                }
            }
        }

        return this.makeOutput(
            queryResult,
            notificationData,
            streamIds,
            cookies,
        ) as StreamsAndCookies
    }
}
