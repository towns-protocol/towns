import { isEqual } from 'lodash-es'
import { isChannelStreamId, spaceIdFromChannelId } from '../../id'
import { MentionResult } from '../models/timelineTypes'
import { TimelinesViewModel } from './timelinesModel'
import { UnreadMarkersModel } from './unreadMarkersTransform'

export interface MentionsModel {
    mentionsMap: Record<
        string,
        {
            mentions: MentionResult[]
            unreadThreadCount: number
            unreadChannelCount: number
        }
    >
}

type Input = {
    timelinesView: TimelinesViewModel
    fullyReadMarkers: UnreadMarkersModel
}

export function spaceMentionsTransform(
    value: Input,
    prev: Input,
    state?: MentionsModel,
): MentionsModel {
    state = state ?? { mentionsMap: {} }

    const unreadMarkers = value.fullyReadMarkers.markers
    const threadsStats = value.timelinesView.threadsStats
    const timelines = value.timelinesView.timelines

    const mentionsMap: Record<string, MentionResult[]> = {}

    for (const [streamId, timeline] of Object.entries(timelines)) {
        if (!isChannelStreamId(streamId)) {
            continue
        }
        const channelId = streamId
        const spaceId = spaceIdFromChannelId(channelId)
        if (!timeline?.length) {
            return state
        }

        let mentions = mentionsMap[spaceId]
        if (!mentions) {
            mentions = []
            mentionsMap[spaceId] = mentions
        }

        const channelMentions = timeline
            .filter((event) => event.isMentioned)
            .map((event) => {
                const threadStat = event.threadParentId
                    ? threadsStats[channelId]?.[event.threadParentId]
                    : undefined
                const fullyReadMarker = unreadMarkers[event.threadParentId ?? channelId]
                return {
                    type: 'mention' as const,
                    unread:
                        fullyReadMarker?.isUnread === true &&
                        event.eventNum >= fullyReadMarker.eventNum,
                    channelId,
                    timestamp: event.createdAtEpochMs,
                    event,
                    thread: threadStat?.parentEvent,
                }
            })
        mentions.push(...channelMentions)
    }

    for (const [spaceId, mentions] of Object.entries(mentionsMap)) {
        mentions.sort(
            //firstBy<MentionResult>((m) => (m.unread ? 0 : 1)).thenBy((a) => a.timestamp, -1),
            (a: MentionResult, b: MentionResult): number => {
                if (a.unread && !b.unread) {
                    return -1
                } else if (!a.unread && b.unread) {
                    return 1
                } else if (a.timestamp > b.timestamp) {
                    return -1
                } else if (a.timestamp < b.timestamp) {
                    return 1
                } else {
                    return 0
                }
            },
        )
        state = setMentions(spaceId, mentions, state)
    }
    return state
}

function setMentions(
    spaceId: string,
    mentions: MentionResult[],
    prev: MentionsModel,
): MentionsModel {
    if (isEqual(prev.mentionsMap[spaceId]?.mentions, mentions)) {
        return prev
    }
    const unreadThreadCount = mentions.reduce((count, m) => {
        return m.thread && m.unread ? count + 1 : count
    }, 0)
    const unreadChannelCount = mentions.reduce((count, m) => {
        return !m.thread && m.unread ? count + 1 : count
    }, 0)
    const next = { mentions, unreadThreadCount, unreadChannelCount }
    return { mentionsMap: { ...prev.mentionsMap, [spaceId]: next } }
}
