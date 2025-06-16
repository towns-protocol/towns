import { Observable } from '../observable/observable'
import { Combine } from '../observable/combine'
import { StreamStatus } from './streams/streamStatus'
import { TimelinesView, TimelinesViewDelegate } from './streams/timelines'
import { makeUserSettingsStreamId } from '../id'
import { UserSettingsStreams } from './streams/userSettingsStreams'
import { FullyReadMarker } from '@towns-protocol/proto'
import { unreadMarkersTransform } from './streams/unreadMarkersTransform'

export type StreamsViewDelegate = TimelinesViewDelegate

// a view of all the streams
export class StreamsView {
    readonly streamStatus: StreamStatus
    readonly timelinesView: TimelinesView
    readonly userSettingsStreams: UserSettingsStreams
    readonly my: { unreadMarkers: Observable<{ markers: Record<string, FullyReadMarker> }> }

    constructor(userId: string, delegate: StreamsViewDelegate | undefined) {
        const userSettingsStreamId = userId !== '' ? makeUserSettingsStreamId(userId) : ''

        this.timelinesView = new TimelinesView(userId, delegate)
        this.userSettingsStreams = new UserSettingsStreams()
        this.streamStatus = new StreamStatus()

        const myRemoteFullyReadMarkers = this.userSettingsStreams.map(
            (x) => x[userSettingsStreamId]?.fullyReadMarkers ?? {},
        )

        ///
        this.my = {
            unreadMarkers: new Combine({
                userId: new Observable(userId),
                myRemoteFullyReadMarkers: myRemoteFullyReadMarkers.throttle(10),
                timelinesView: this.timelinesView.throttle(15),
            })
                .throttle(250)
                .map(unreadMarkersTransform),
        }
    }
}
