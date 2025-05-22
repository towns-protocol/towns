import { Observable } from '../../../observable/observable'
import { TimelineEvent, type MessageTips, isMessageTipEvent } from './timeline-types'

// { eventId: MessageTipEvent }
export type TipsMap = Record<string, MessageTips>
export class Tips extends Observable<TipsMap> {
    constructor(initialValue: TipsMap = {}) {
        super(initialValue)
    }

    get(eventId: string): MessageTips | undefined {
        return this.value[eventId]
    }

    update(fn: (current: TipsMap) => TipsMap): void {
        this.setValue(fn(this.value))
    }

    reset() {
        this.setValue({})
    }

    removeTip(event: TimelineEvent) {
        if (!isMessageTipEvent(event)) {
            return
        }
        const refEventId = event.content.refEventId
        if (!this.get(refEventId)) {
            return
        }
        this.update((tips) => {
            const mutation = { ...tips }
            delete mutation[refEventId]
            return mutation
        })
    }

    addTip(event: TimelineEvent, direction: 'append' | 'prepend') {
        if (!isMessageTipEvent(event)) {
            return
        }
        const refEventId = event.content.refEventId
        this.update((tips) => {
            if (direction === 'append') {
                return {
                    ...tips,
                    [refEventId]: [...(tips[refEventId] ?? []), event],
                }
            } else {
                return {
                    ...tips,
                    [refEventId]: [event, ...(tips[refEventId] ?? [])],
                }
            }
        })
    }

    addTips(event: TimelineEvent, direction: 'append' | 'prepend') {
        if (!isMessageTipEvent(event)) {
            return
        }
        // note to future self, if anyone starts uploading the same transaction multiple times,
        // store the tips in a Record keyed by transactionHash instead of eventId
        this.addTip(event, direction)
    }
}
