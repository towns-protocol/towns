import {
    Err,
    FullEvent,
    StreamAndCookie,
    StreamsAndCookies,
    SyncPos,
    throwWithCode,
} from '@zion/core'
import debug from 'debug'
import _, { delay } from 'lodash'
// import { config } from '../config'
import { EventStore } from './eventStore'
import { Pool } from 'pg'
import format, { string } from 'pg-format'

const log = debug('zion:PGEventStore')

// TODO - make this a config
export const createPGPool = () =>
    new Pool({
        user: 'postgres',
        database: 'casablanca',
        port: 5433,
        password: 'postgres',
    })

const PG_EVENT_TABLE_NAME_PREFIX = 'event_stream_'

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
        const table_name = PG_EVENT_TABLE_NAME_PREFIX + streamId
        const insert_query = format(
            'INSERT INTO %I (data) VALUES %L RETURNING event_id',
            table_name,
            events.map((event) => [JSON.stringify(event)]),
        )
        let ret = await this.pool.query(insert_query).catch(async (err) => {
            if (err.code == '42P01') {
                // table does not exist
                log('addEvents', 'table does not exist:', table_name)
                if (newStream == false) {
                    throw new Error('Stream does not exist')
                }
                // TODO - figure out a better way to create table as this uses the existing PK seq which is shared
                const create_query = format(
                    'CREATE TABLE %I (LIKE event_stream_sample INCLUDING ALL)',
                    table_name,
                )
                await this.pool.query(create_query)
                return this.pool.query(insert_query)
            } else {
                throw err
            }
        })
        if (ret.rows.length == 0) {
            throw new Error('Failed to add events')
        }
        return ret.rows[ret.rows.length - 1].event_id
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
        const table_name = PG_EVENT_TABLE_NAME_PREFIX + streamId
        const query = format('SELECT 1 FROM %I', table_name)
        const ret = await this.pool.query(query).catch((err) => {
            if (err.code != '42P01') {
                // capture table not exists error
                throw err
            }
        })
        const stream_exists = ret ? true : false
        log('streamExists', streamId, 'ret', stream_exists)
        return stream_exists
    }

    async getEventStream(streamId: string): Promise<StreamAndCookie> {
        const table_name = PG_EVENT_TABLE_NAME_PREFIX + streamId
        const query = format('SELECT * FROM %I', table_name)
        const ret = await this.pool.query(query)
        log('getEventStream', streamId, 'ret', ret)
        if (ret.rows.length <= 0) {
            throwWithCode('Stream not found', Err.STREAM_NOT_FOUND)
        }
        return {
            events: ret.rows.map((item) => JSON.parse(item.data)),
            syncCookie: ret.rows[ret.rows.length - 1].event_id,
        }
    }

    // TODO - revisit timeousMs and see if we need BLOCK with postgres
    async readNewEvents(args: SyncPos[], timeousMs: number = 0): Promise<StreamsAndCookies> {
        if (args.length <= 0) {
            throw new Error('args must not be empty')
        }

        const streamIds = args.map((arg) => arg.streamId)
        const cookies = args.map((arg) => arg.syncCookie)

        log('readNewEvents', 'readArgs', ...streamIds, ...cookies)

        let output = Object()
        await Promise.all(
            streamIds.map(async (streamId, index) => {
                // TODO - figure out how to query all tables at once or in batches. Maybe UNION?
                const cookie = cookies[index]
                const table_name = PG_EVENT_TABLE_NAME_PREFIX + streamId
                const query = format('SELECT * FROM %I WHERE event_id > %s', table_name, cookie)
                const ret = await this.pool.query(query)
                // TODO - handle subset of queries failure gracefully
                if (ret.rows.length > 0) {
                    output[streamId] = {
                        events: ret.rows.map((item) => JSON.parse(item.data)),
                        syncCookie: ret.rows[ret.rows.length - 1].event_id,
                        originalSyncCookie: cookie,
                    }
                }
            }),
        )
        return output as StreamsAndCookies
    }
}
