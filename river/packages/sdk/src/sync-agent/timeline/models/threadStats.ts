import { Observable } from '../../../observable/observable'
import { RiverTimelineEvent, TimelineEvent, ThreadStatsData } from './timeline-types'
import { getMessageSenderId, getChannelMessageContent } from './timelineEvent'

// eventId -> threadStats
export type ThreadStatsMap = Record<string, ThreadStatsData>

// TODO: better name
export class ThreadStats extends Observable<ThreadStatsMap> {
    constructor(initialValue: ThreadStatsMap = {}) {
        super(initialValue)
    }

    update(fn: (current: ThreadStatsMap) => ThreadStatsMap): void {
        this.setValue(fn(this.value))
    }

    reset() {
        this.setValue({})
    }

    get(eventId: string): ThreadStatsData | undefined {
        return this.value?.[eventId]
    }

    add(userId: string, event: TimelineEvent, currentTimeline: TimelineEvent[]) {
        const parentId = event.threadParentId
        // if we have a parent...
        if (parentId) {
            this.update((current) => ({
                ...current,
                [parentId]: this.formatThreadStat(
                    userId,
                    event,
                    makeNewThreadStats(event, parentId, currentTimeline),
                ),
            }))
        }

        // if we are a parent...
        if (this.value?.[event.eventId]) {
            this.update((current) => ({
                ...current,
                // TODO: try using somehow the formatThreadStat function
                [event.eventId]: {
                    ...current[event.eventId],
                    parentEvent: event,
                    parentMessageContent: getChannelMessageContent(event),
                    isParticipating:
                        this.value?.[event.eventId]?.isParticipating ||
                        (event.content?.kind !== RiverTimelineEvent.RedactedEvent &&
                            this.value?.[event.eventId]?.replyEventIds.size > 0 &&
                            (event.sender.id === userId || event.isMentioned)),
                },
            }))
        }
    }

    remove(timelineEvent: TimelineEvent) {
        const parentId = timelineEvent.threadParentId
        if (!parentId) {
            return
        }
        if (!this.value?.[parentId]) {
            return
        }
        const updated = { ...this.value }
        const entry = updated[parentId]
        if (entry) {
            entry.replyEventIds.delete(timelineEvent.eventId)
            if (entry.replyEventIds.size === 0) {
                delete updated[parentId]
            } else {
                const senderId = getMessageSenderId(timelineEvent)
                if (senderId) {
                    entry.userIds.delete(senderId)
                }
            }
        }
        this.setValue(updated)
    }

    private formatThreadStat(userId: string, event: TimelineEvent, threadStat: ThreadStatsData) {
        if (event.content?.kind === RiverTimelineEvent.RedactedEvent) {
            return threadStat
        }
        threadStat.replyEventIds.add(event.eventId)
        threadStat.latestTs = Math.max(threadStat.latestTs, event.createdAtEpochMs)
        const senderId = getMessageSenderId(event)
        if (senderId) {
            threadStat.userIds.add(senderId)
        }
        threadStat.isParticipating =
            threadStat.isParticipating ||
            threadStat.userIds.has(userId) ||
            threadStat.parentEvent?.sender.id === userId ||
            event.isMentioned
        return threadStat
    }
}

function makeNewThreadStats(
    event: TimelineEvent,
    parentId: string,
    timeline?: TimelineEvent[],
): ThreadStatsData {
    // one time lookup of the parent message for the first reply
    const parent = timeline?.find((t) => t.eventId === parentId)
    return {
        replyEventIds: new Set<string>(),
        userIds: new Set<string>(),
        latestTs: event.createdAtEpochMs,
        parentId,
        parentEvent: parent,
        parentMessageContent: getChannelMessageContent(parent),
        isParticipating: false,
    }
}
