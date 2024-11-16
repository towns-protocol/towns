import { Observable } from '../../../observable/observable'
import { TimelineEvent, RiverTimelineEvent, type MessageReactions } from './timeline-types'

// { parentEventId -> { reactionName: { userId: { eventId: string } } } }
export type ReactionsMap = Record<string, MessageReactions>
export class Reactions extends Observable<ReactionsMap> {
    constructor(initialValue: ReactionsMap = {}) {
        super(initialValue)
    }

    get(parentId: string): MessageReactions | undefined {
        // due to delete, removeEvent can leave empty keys in the map, so we need to check for that
        const reactions = this.value[parentId]
        return reactions && Object.keys(reactions).length > 0 ? reactions : undefined
    }

    update(fn: (current: ReactionsMap) => ReactionsMap): void {
        this.setValue(fn(this.value))
    }

    reset() {
        this.setValue({})
    }

    removeEvent(event: TimelineEvent) {
        const parentId = event.reactionParentId
        const content =
            event.content?.kind === RiverTimelineEvent.Reaction ? event.content : undefined
        if (!content || !parentId || !this.value[parentId]) {
            return
        }
        const reactionName = content.reaction
        const senderId = event.sender.id

        const mutation = { ...this.value }
        if (mutation[parentId]?.[reactionName]?.[senderId]) {
            // delete sender entry
            delete mutation[parentId][reactionName][senderId]
            // if reaction is empty, delete it
            if (Object.keys(mutation[parentId][reactionName]).length === 0) {
                delete mutation[parentId][reactionName]
            }
            // if parent has no reactions, delete it
            if (Object.keys(mutation[parentId]).length === 0) {
                delete mutation[parentId]
            }
        }
        this.setValue(mutation)
    }

    addEvent(event: TimelineEvent) {
        const parentId = event.reactionParentId
        if (!parentId) {
            return
        }
        this.update((reactions) => ({
            ...reactions,
            [parentId]: this.addReaction(event, reactions[parentId]),
        }))
    }

    private addReaction(event: TimelineEvent, entry?: MessageReactions): MessageReactions {
        const content =
            event.content?.kind === RiverTimelineEvent.Reaction ? event.content : undefined
        if (!content) {
            return entry ?? {}
        }
        const reactionName = content.reaction
        const senderId = event.sender.id
        return {
            ...entry,
            [reactionName]: {
                ...entry?.[reactionName],
                [senderId]: { eventId: event.eventId },
            },
        }
    }
}
