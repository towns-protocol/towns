import { ObservableRecord } from '../../observable/observableRecord'

// sorted list of user ids in the stream
export class StreamMemberIdsView extends ObservableRecord<string, string[]> {
    constructor() {
        super({
            defaultValue: [],
        })
    }

    setMembers(streamId: string, memberIds: string[]) {
        this.setValueFor(streamId, memberIds.sort())
    }

    addMember(streamId: string, memberId: string) {
        this.set((prev) => {
            const newMemberIds = [memberId, ...(prev[streamId] ?? [])].sort()
            return {
                ...prev,
                [streamId]: newMemberIds,
            }
        })
    }

    removeMember(streamId: string, memberId: string) {
        this.set((prev) => {
            if (!prev[streamId]) {
                return prev
            }
            const newMemberIds = prev[streamId]?.filter((id) => id !== memberId)
            return {
                ...prev,
                [streamId]: newMemberIds,
            }
        })
    }
}
