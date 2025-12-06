import { Observable } from '../observable/observable'
import { combine } from '../observable/combine'
import { StreamStatus } from './streams/streamStatus'
import { MutableTimelinesView, TimelinesViewDelegate } from './streams/mutableTimelinesView'
import {
    makeUserInboxStreamId,
    makeUserMetadataStreamId,
    makeUserSettingsStreamId,
    makeUserStreamId,
} from '../id'
import { UserSettingsStreamModel, UserSettingsStreamsView } from './streams/userSettingsStreams'
import { UnreadMarkersModel, unreadMarkersTransform } from './transforms/unreadMarkersTransform'
import { MentionsModel, spaceMentionsTransform } from './transforms/spaceMentionsTransform'
import { SpaceStreamsView } from './streams/spaceStreams'
import { UserStreamModel, UserStreamsView } from './streams/userStreamsView'
import { UserMetadataStreamModel, UserMetadataStreamsView } from './streams/userMetadataStreams'
import { UserInboxStreamModel, UserInboxStreamsView } from './streams/userInboxStreams'
import { ChannelStreamsView } from './streams/channelStreams'
import { DmStreamsView } from './streams/dmStreams'
import { GdmStreamsView } from './streams/gdmStreams'
import { membershipsTransform } from './transforms/membershipsTransform'
import { Membership, TimelineEvent } from './models/timelineTypes'
import { spaceIdsTransform } from './transforms/spaceIdsTransform'
import { DmAndGdmModel, dmsAndGdmsTransform } from './transforms/dmsAndGdmsTransform'
import { StreamMemberIdsView } from './streams/streamMemberIds'
import { dmsAndGdmsUnreadIdsTransform } from './transforms/dmsAndGdmsUnreadIdsTransform'
import { blockedUserIdsTransform } from './transforms/blockedUserIdsTransform'
import { NotificationSettings } from './streams/notificationSettings'
import { SpaceUnreadsModel, spaceUnreadsTransform } from './transforms/spaceUnreadsTransform'
import { streamMemberIdsSansUserTransform } from './transforms/streamMemberIdsSansUserTransform'
import { Constant } from '../observable/constant'
import { MembersNotInDms, membersNotInDmsTransform } from './transforms/membersNotInDmsTransform'
import { mutedStreamIdsTransform } from './transforms/mutedStreamIdsTransform'

export type StreamsViewDelegate = TimelinesViewDelegate

class Consts {
    static obj = {}
    static arr = []
}

// a view of all the streams
export class StreamsView {
    readonly lastAccessedAt: Observable<Record<string, number>>
    readonly notificationSettings: NotificationSettings
    readonly mutedStreamIds: Observable<Set<string>>
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
    readonly timelinesView: MutableTimelinesView
    readonly latestEventByUser: Observable<Record<string, TimelineEvent>>
    readonly my: {
        userId: Constant<string>
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
        spaceUnreads: Observable<SpaceUnreadsModel>
    }

    constructor(userId: string, delegate: StreamsViewDelegate | undefined) {
        const myUserId = new Constant(userId)
        const userStreamId = userId !== '' ? makeUserStreamId(userId) : ''
        const userInboxStreamId = userId !== '' ? makeUserInboxStreamId(userId) : ''
        const userMetadataStreamId = userId !== '' ? makeUserMetadataStreamId(userId) : ''
        const userSettingsStreamId = userId !== '' ? makeUserSettingsStreamId(userId) : ''

        this.lastAccessedAt = new Observable<Record<string, number>>({})
        this.notificationSettings = new NotificationSettings()
        this.mutedStreamIds = this.notificationSettings.map(mutedStreamIdsTransform)
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
        this.timelinesView = new MutableTimelinesView(userId, delegate)
        this.latestEventByUser = this.timelinesView.throttle(1000).map((x) => x.lastestEventByUser)

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
            myRemoteFullyReadMarkers: myRemoteFullyReadMarkers,
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

        const streamMemberIdsSansCurrentUser = combine({
            userId: myUserId,
            streamMemberIds: this.streamMemberIds,
        }).map(streamMemberIdsSansUserTransform)

        const myDmsAndGdms = combine({
            memberships: myMemberships,
            streamMemberIds: streamMemberIdsSansCurrentUser,
            dmStreams: this.dmStreams,
            gdmStreams: this.gdmStreams,
        })
            .throttle(250)
            .map(dmsAndGdmsTransform)

        const myDmsAndGdmsUnreadIds = combine({
            dmGlobal: this.notificationSettings.map((x) => x.settings?.dmGlobal),
            gdmGlobal: this.notificationSettings.map((x) => x.settings?.gdmGlobal),
            mutedStreamIds: this.mutedStreamIds,
            myDmsAndGdms,
            unreadMarkers,
        })
            .throttle(250)
            .map(dmsAndGdmsUnreadIdsTransform)

        const myBlockedUserIds = myRemoteUserBlocks.map(blockedUserIdsTransform)

        const mySpaceUnreads = combine({
            mutedStreamIds: this.mutedStreamIds,
            timelinesView: throttledTimelinesView,
            myUnreadMarkers: unreadMarkers,
        })
            .throttle(250)
            .map(spaceUnreadsTransform)

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
            spaceUnreads: mySpaceUnreads,
        }
    }

    membersNotInDms(streamId: string): Observable<MembersNotInDms> {
        return combine({
            memberIds: this.streamMemberIds.map((x) => x[streamId] ?? Consts.arr),
            latestEventByUser: this.timelinesView.map((x) => x.lastestEventByUser ?? Consts.obj),
            dmsAndGdms: this.my.dmsAndGdms,
        })
            .throttle(1000)
            .map(membersNotInDmsTransform)
    }

    setLastAccessedAt(lastAccessedAt: Record<string, number>) {
        this.lastAccessedAt.setValue(lastAccessedAt)
    }

    setHighPriorityStreams(streamIds: string[]) {
        this.lastAccessedAt.set((prev) => {
            const newLastAccessedAt = { ...prev }
            streamIds.forEach((streamId) => {
                newLastAccessedAt[streamId] = Date.now()
            })
            return newLastAccessedAt
        })
    }
}
