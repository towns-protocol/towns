import { FullEvent, StreamAndCookie, StreamsAndCookies, SyncPos } from '@zion/core'
import _ from 'lodash'

export interface EventStore {
    close(): Promise<void>

    /**
     *
     * @param streamId
     * @param inceptionEvents
     * @returns sync cookie for reading new events from the stream
     */
    createEventStream(streamId: string, inceptionEvents: FullEvent[]): Promise<string>

    /**
     *
     * @param streamId
     * @param events
     * @returns sync cookie for reading new events from the stream
     */
    addEvents(streamId: string, events: FullEvent[]): Promise<string>

    streamExists(streamId: string): Promise<boolean>

    getEventStream(streamId: string): Promise<StreamAndCookie>

    readNewEvents(args: SyncPos[], timeousMs: number): Promise<StreamsAndCookies>
}
