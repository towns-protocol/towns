/* eslint-disable no-console */
import { SnapshotCaseType } from '@towns-protocol/proto'
import { Stream } from '../../stream'
import {
    MessageReactions,
    MessageTips,
    ThreadStatsData,
    type TimelineEvent,
} from '../../views/models/timelineTypes'
import type { RiverConnection } from '../river-connection/riverConnection'
import { Observable } from '../../observable/observable'
import { TimelinesMap, TimelinesViewModel } from '../../views/streams/timelinesModel'

const EMPTY_TIMELINE: TimelineEvent[] = []
const EMPTY_RECORD = {}

export class MessageTimeline {
    events = new Observable<TimelineEvent[]>(EMPTY_TIMELINE)
    threads = new Observable<TimelinesMap>(EMPTY_RECORD)
    threadsStats = new Observable<Record<string, ThreadStatsData>>(EMPTY_RECORD)
    reactions = new Observable<Record<string, MessageReactions>>(EMPTY_RECORD)
    tips = new Observable<Record<string, MessageTips>>(EMPTY_RECORD)
    unsubFn: (() => void) | undefined

    // TODO: figure out a better way to do online check
    // lastestEventByUser = new TimelineEvents()

    // TODO: we probably wont need this for a while
    filterFn: (event: TimelineEvent, kind: SnapshotCaseType) => boolean = (_event, _kind) => {
        return true
    }
    constructor(
        private streamId: string,
        private userId: string,
        private riverConnection: RiverConnection,
    ) {
        //
    }

    initialize(stream: Stream) {
        this.reset()
        this.unsubFn = stream.view.streamsView.timelinesView.subscribe(
            (state: TimelinesViewModel) => {
                this.events.setValue(state.timelines[this.streamId] ?? EMPTY_TIMELINE)
                this.threads.setValue(state.threads[this.streamId] ?? EMPTY_RECORD)
                this.threadsStats.setValue(state.threadsStats[this.streamId] ?? EMPTY_RECORD)
                this.reactions.setValue(state.reactions[this.streamId] ?? EMPTY_RECORD)
                this.tips.setValue(state.tips[this.streamId] ?? EMPTY_RECORD)
            },
            { fireImediately: true },
        )
    }

    async scrollback(): Promise<{ terminus: boolean; fromInclusiveMiniblockNum: bigint }> {
        return this.riverConnection.callWithStream(this.streamId, async (client) => {
            return client
                .scrollback(this.streamId)
                .then(({ terminus, fromInclusiveMiniblockNum }) => ({
                    terminus,
                    fromInclusiveMiniblockNum,
                }))
        })
    }

    private reset() {
        this.unsubFn?.()
        this.unsubFn = undefined
        this.events.setValue(EMPTY_TIMELINE)
        this.threads.setValue(EMPTY_RECORD)
        this.threadsStats.setValue(EMPTY_RECORD)
        this.reactions.setValue(EMPTY_RECORD)
        this.tips.setValue(EMPTY_RECORD)
    }
}
