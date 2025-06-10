/* eslint-disable no-console */
import { SnapshotCaseType } from '@towns-protocol/proto'
import { Stream } from '../../stream'
import {
    MessageReactions,
    MessageTips,
    ThreadStatsData,
    type TimelineEvent,
} from './models/timeline-types'
import type { RiverConnection } from '../river-connection/riverConnection'
import { Observable } from '../../observable/observable'
import { TimelinesMap, TimelinesViewModel } from '../../streams-view/timelinesViewModel'

export class MessageTimeline {
    events = new Observable<TimelineEvent[]>([])
    threads = new Observable<TimelinesMap>({})
    threadsStats = new Observable<Record<string, ThreadStatsData>>({})
    reactions = new Observable<Record<string, MessageReactions>>({})
    tips = new Observable<Record<string, MessageTips>>({})
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
                this.events.setValue(state.timelines[this.streamId])
                this.threads.setValue(state.threads[this.streamId])
                this.threadsStats.setValue(state.threadsStats[this.streamId])
                this.reactions.setValue(state.reactions[this.streamId])
                this.tips.setValue(state.tips[this.streamId])
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
        this.events.setValue([])
        this.threads.setValue({})
        this.threadsStats.setValue({})
        this.reactions.setValue({})
        this.tips.setValue({})
    }
}
