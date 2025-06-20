import { Observable } from '../observable/observable'
import { combine } from '../observable/combine'
import { StreamStatus } from './streams/streamStatus'
import { TimelinesView, TimelinesViewDelegate } from './streams/timelines'
import { makeUserSettingsStreamId } from '../id'
import { UserSettingsStreamsView } from './streams/userSettingsStreams'
import { UnreadMarkersModel, unreadMarkersTransform } from './streams/unreadMarkersTransform'
import { MentionsModel, spaceMentionsTransform } from './streams/spaceMentionsTransform'
import { SpaceStreamsView } from './streams/spaceStreams'
import { UserStreamsView } from './streams/userStreamsView'
import { UserMetadataStreamsView } from './streams/userMetadataStreams'
import { UserInboxStreamsView } from './streams/userInboxStreams'
import { ChannelStreamsView } from './streams/channelStreams'
import { DmStreamsView } from './streams/dmStreams'
import { GdmStreamsView } from './streams/gdmStreams'

export type StreamsViewDelegate = TimelinesViewDelegate

// a view of all the streams
export class StreamsView {
    readonly streamStatus: StreamStatus
    readonly spaceStreams: SpaceStreamsView
    readonly channelStreams: ChannelStreamsView
    readonly dmStreams: DmStreamsView
    readonly gdmStreams: GdmStreamsView
    readonly userStreams: UserStreamsView
    readonly userInboxStreams: UserInboxStreamsView
    readonly userMetadataStreams: UserMetadataStreamsView
    readonly userSettingsStreams: UserSettingsStreamsView
    readonly timelinesView: TimelinesView
    readonly my: {
        unreadMarkers: Observable<UnreadMarkersModel>
        spaceMentions: Observable<MentionsModel>
    }

    constructor(userId: string, delegate: StreamsViewDelegate | undefined) {
        const userSettingsStreamId = userId !== '' ? makeUserSettingsStreamId(userId) : ''

        this.userSettingsStreams = new UserSettingsStreamsView()
        this.spaceStreams = new SpaceStreamsView()
        this.channelStreams = new ChannelStreamsView()
        this.dmStreams = new DmStreamsView()
        this.gdmStreams = new GdmStreamsView()
        this.streamStatus = new StreamStatus()
        this.userStreams = new UserStreamsView()
        this.userMetadataStreams = new UserMetadataStreamsView()
        this.userInboxStreams = new UserInboxStreamsView()
        this.timelinesView = new TimelinesView(userId, delegate)

        const throttledTimelinesView = this.timelinesView.throttle(15)

        const myRemoteFullyReadMarkers = this.userSettingsStreams.map(
            (x) => x[userSettingsStreamId]?.fullyReadMarkers ?? {},
        )

        const unreadMarkers = combine({
            userId: new Observable(userId),
            myRemoteFullyReadMarkers: myRemoteFullyReadMarkers.throttle(10),
            timelinesView: throttledTimelinesView,
        })
            .throttle(250)
            .map(unreadMarkersTransform)

        const spaceMentions = combine({
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
