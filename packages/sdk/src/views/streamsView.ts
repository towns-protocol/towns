import { Observable } from '../observable/observable'
import { combine } from '../observable/combine'
import { StreamStatus } from './streams/streamStatus'
import { TimelinesView, TimelinesViewDelegate } from './streams/timelines'
import {
    makeUserInboxStreamId,
    makeUserMetadataStreamId,
    makeUserSettingsStreamId,
    makeUserStreamId,
} from '../id'
import { UserSettingsStreamModel, UserSettingsStreamsView } from './streams/userSettingsStreams'
import { UnreadMarkersModel, unreadMarkersTransform } from './streams/unreadMarkersTransform'
import { MentionsModel, spaceMentionsTransform } from './streams/spaceMentionsTransform'
import { SpaceStreamsView } from './streams/spaceStreams'
import { UserStreamModel, UserStreamsView } from './streams/userStreamsView'
import { UserMetadataStreamModel, UserMetadataStreamsView } from './streams/userMetadataStreams'
import { UserInboxStreamModel, UserInboxStreamsView } from './streams/userInboxStreams'
import { ChannelStreamsView } from './streams/channelStreams'
import { DmStreamsView } from './streams/dmStreams'
import { GdmStreamsView } from './streams/gdmStreams'
import { membershipsTransform } from './transforms/membershipsTransform'
import { Membership } from './models/timelineTypes'
import { spaceIdsTransform } from './transforms/spaceIdsTransform'
import { DmAndGdmModel, dmsAndGdmsTransform } from './transforms/dmsAndGdmsTransform'
import { StreamMemberIdsView } from './streams/streamMemberIds'
import { dmsAndGdmsUnreadIdsTransform } from './transforms/dmsAndGdmsUnreadIdsTransform'
import { blockedUserIdsTransform } from './transforms/blockedUserIdsTransform'
import { NotificationSettings } from './streams/notificationSettings'

export type StreamsViewDelegate = TimelinesViewDelegate

class Consts {
    static obj = {}
    static arr = []
}

// a view of all the streams
export class StreamsView {
    readonly notificationSettings: NotificationSettings
    readonly streamStatus: StreamStatus
    readonly streamMemberIds: StreamMemberIdsView
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
        userId: Observable<string> // never changes, but useful for combine
        userStream: Observable<UserStreamModel | undefined>
        userInboxStream: Observable<UserInboxStreamModel | undefined>
        userMetadataStream: Observable<UserMetadataStreamModel | undefined>
        userSettingsStream: Observable<UserSettingsStreamModel | undefined>
        unreadMarkers: Observable<UnreadMarkersModel>
        spaceMentions: Observable<MentionsModel>
        memberships: Observable<Record<string, Membership>>
        spaceIds: Observable<string[]>
        dmsAndGdms: Observable<DmAndGdmModel[]>
        dmsAndGdmsUnreadIds: Observable<Set<string>>
        blockedUserIds: Observable<Set<string>>
    }

    constructor(userId: string, delegate: StreamsViewDelegate | undefined) {
        const myUserId = new Observable(userId)
        const userStreamId = userId !== '' ? makeUserStreamId(userId) : ''
        const userInboxStreamId = userId !== '' ? makeUserInboxStreamId(userId) : ''
        const userMetadataStreamId = userId !== '' ? makeUserMetadataStreamId(userId) : ''
        const userSettingsStreamId = userId !== '' ? makeUserSettingsStreamId(userId) : ''

        this.notificationSettings = new NotificationSettings()
        this.streamStatus = new StreamStatus()
        this.streamMemberIds = new StreamMemberIdsView()
        this.userSettingsStreams = new UserSettingsStreamsView()
        this.spaceStreams = new SpaceStreamsView()
        this.channelStreams = new ChannelStreamsView()
        this.dmStreams = new DmStreamsView()
        this.gdmStreams = new GdmStreamsView()
        this.userStreams = new UserStreamsView()
        this.userMetadataStreams = new UserMetadataStreamsView()
        this.userInboxStreams = new UserInboxStreamsView()
        this.timelinesView = new TimelinesView(userId, delegate)

        // throttle the timelines for subsequent observers
        const throttledTimelinesView = this.timelinesView.throttle(15)

        // map my streams
        const myUserStream = this.userStreams.map((x) => x[userStreamId])
        const myUserInboxStream = this.userInboxStreams.map((x) => x[userInboxStreamId])
        const myUserMetadataStream = this.userMetadataStreams.map((x) => x[userMetadataStreamId])
        const myUserSettingsStream = this.userSettingsStreams.map((x) => x[userSettingsStreamId])

        // grab the remote fully read markers
        const myRemoteFullyReadMarkers = myUserSettingsStream
            .throttle(10)
            .map((x) => x?.fullyReadMarkers ?? Consts.obj)

        const myRemoteUserBlocks = myUserSettingsStream
            .throttle(10)
            .map((x) => x?.userBlocks ?? Consts.obj)

        // combine the userId, my remote fully read markers, and the timelines view
        // to get the unread markers
        const unreadMarkers = combine({
            userId: myUserId,
            myRemoteFullyReadMarkers: myRemoteFullyReadMarkers.throttle(10),
            timelinesView: throttledTimelinesView,
        })
            .throttle(250)
            .map(unreadMarkersTransform)

        // grab the space mentions
        const spaceMentions = combine({
            timelinesView: throttledTimelinesView,
            fullyReadMarkers: unreadMarkers,
        })
            .throttle(250)
            .map(spaceMentionsTransform)

        const throttledMyUserStream = myUserStream.throttle(10)

        const myMemberships = throttledMyUserStream.map(membershipsTransform)

        const mySpaceIds = myMemberships.map(spaceIdsTransform)

        const myDmsAndGdms = combine({
            userId: myUserId,
            memberships: myMemberships,
            streamMemberIds: this.streamMemberIds,
            dmStreams: this.dmStreams,
            gdmStreams: this.gdmStreams,
        })
            .throttle(250)
            .map(dmsAndGdmsTransform)

        const myDmsAndGdmsUnreadIds = combine({ myDmsAndGdms, unreadMarkers })
            .throttle(250)
            .map(dmsAndGdmsUnreadIdsTransform)

        const myBlockedUserIds = myRemoteUserBlocks.map(blockedUserIdsTransform)

        ///
        this.my = {
            userId: myUserId,
            userStream: myUserStream,
            userInboxStream: myUserInboxStream,
            userMetadataStream: myUserMetadataStream,
            userSettingsStream: myUserSettingsStream,
            unreadMarkers,
            spaceMentions,
            memberships: myMemberships,
            spaceIds: mySpaceIds,
            dmsAndGdms: myDmsAndGdms,
            dmsAndGdmsUnreadIds: myDmsAndGdmsUnreadIds,
            blockedUserIds: myBlockedUserIds,
        }
    }
}
