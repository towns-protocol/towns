import { useMemo } from 'react'
import { RoomIdentifier } from '../types/matrix-types'
import { useZionContext } from '../components/ZionContextProvider'
import { TimelineEvent } from '../types/timeline-types'

export function useTimeline(roomId?: RoomIdentifier): TimelineEvent[] {
    const { timelines } = useZionContext()
    const timeline = useMemo(
        () => (roomId ? timelines[roomId.matrixRoomId] ?? [] : []),
        [roomId, timelines],
    )
    // todo, test to see if two use memos is necessary at all?
    // the timelines object is changing constantly, every time a new event comes in
    // for any room, but the timeline array should be a little more stable
    return useMemo(() => timeline, [timeline])
}
