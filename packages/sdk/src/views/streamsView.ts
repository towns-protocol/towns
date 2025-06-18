import { Observable } from '../observable/observable'
import { Combine } from '../observable/combine'
import { StreamStatus } from './streams/streamStatus'
import { TimelinesView, TimelinesViewDelegate } from './streams/timelines'
import { makeUserSettingsStreamId } from '../id'
import { UserSettingsStreams } from './streams/userSettingsStreams'
import { UnreadMarkersModel, unreadMarkersTransform } from './streams/unreadMarkersTransform'
import { MentionsModel, spaceMentionsTransform } from './streams/spaceMentionsTransform'

export type StreamsViewDelegate = TimelinesViewDelegate

// a view of all the streams
export class StreamsView {
    readonly streamStatus: StreamStatus
    readonly timelinesView: TimelinesView
    readonly userSettingsStreams: UserSettingsStreams
    readonly my: {
        unreadMarkers: Observable<UnreadMarkersModel>
        spaceMentions: Observable<MentionsModel>
    }

    constructor(userId: string, delegate: StreamsViewDelegate | undefined) {
        const userSettingsStreamId = userId !== '' ? makeUserSettingsStreamId(userId) : ''

        this.timelinesView = new TimelinesView(userId, delegate)
        this.userSettingsStreams = new UserSettingsStreams()
        this.streamStatus = new StreamStatus()

        const throttledTimelinesView = this.timelinesView.throttle(15)

        const myRemoteFullyReadMarkers = this.userSettingsStreams.map(
            (x) => x[userSettingsStreamId]?.fullyReadMarkers ?? {},
        )

        const unreadMarkers = new Combine({
            userId: new Observable(userId),
            myRemoteFullyReadMarkers: myRemoteFullyReadMarkers.throttle(10),
            timelinesView: throttledTimelinesView,
        })
            .throttle(250)
            .map(unreadMarkersTransform)

        const spaceMentions = new Combine({
            timelinesView: throttledTimelinesView,
            fullyReadMarkers: unreadMarkers,
        })
            .throttle(250)
            .map(spaceMentionsTransform)

        ///
        this.my = {
            unreadMarkers,
            spaceMentions,
        }
    }
}
