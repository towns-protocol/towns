export type { Space, SpaceIdentifier, TransactionContext } from './client/ZionClientTypes'
export { TransactionStatus, SpaceProtocol } from './client/ZionClientTypes'

export { ChannelContextProvider, useChannelContext } from './components/ChannelContextProvider'
export { QueryProvider } from './components/QueryProvider'
export { SpaceContextProvider, useSpaceContext } from './components/SpaceContextProvider'
export { ZionContextProvider, useZionContext } from './components/ZionContextProvider'
export { useWeb3Context } from './components/Web3ContextProvider'

export { LoginStatus } from './hooks/login'
export { useChannelData } from './hooks/use-channel-data'
export { useChannelId } from './hooks/use-channel-id'
export { useChannelMembers } from './hooks/use-channel-members'
export { useChannelNotificationCounts } from './hooks/use-channel-notification-counts'
export { useChannelReactions } from './hooks/use-channel-reactions'
export { useChannelThread } from './hooks/use-channel-thread'
export { useChannelTimeline } from './hooks/use-channel-timeline'
export { useChannelThreadStat } from './hooks/use-channel-thread-stat'
export { useChannelThreadStats } from './hooks/use-channel-thread-stats'
export { useCreateChannelTransaction } from './hooks/use-create-channel-transaction'
export { useCreateSpaceTransaction } from './hooks/use-create-space-transaction'
export { useFullyReadMarker } from './hooks/use-fully-read-marker'
export { useMatrixCredentials } from './hooks/use-matrix-credentials'
export { useMember } from './hooks/use-member'
export { useMembers } from './hooks/use-members'
export { useMembership } from './hooks/use-membership'
export { useMyMembership } from './hooks/use-my-membership'
export { useMyProfile } from './hooks/use-my-profile'
export { usePowerLevels } from './hooks/use-power-levels'
export { useRoles } from './hooks/use-roles'
export { useRoleDetails } from './hooks/use-role-details'
export { useRoom } from './hooks/use-room'
export { useServerVersions } from './hooks/use-server-versions'
export { useSpaceData, useInvites, useInvitesForSpace, useInviteData } from './hooks/use-space-data'
export { useSpaceDapp } from './hooks/use-space-dapp'
export { useSpaceHierarchy } from './hooks/use-space-hierarchy'
export { useSpaceId } from './hooks/use-space-id'
export { useSpaceMembers } from './hooks/use-space-members'
export { useSpaceMentions } from './hooks/use-space-mentions'
export { useSpaceNotificationCounts } from './hooks/use-space-notification-counts'
export { useSpaceTimeline } from './hooks/use-space-timeline'
export { useSpaceThreadRoots, useSpaceThreadRootsUnreadCount } from './hooks/use-space-thread-roots'
export { useSpacesFromContract, useSpaceFromContract } from './hooks/use-spaces-from-contract'
export { useTimelineReactions } from './hooks/use-timeline-reactions'
export { useTimelineThread } from './hooks/use-timeline-thread'
export { useTimelineThreadStats } from './hooks/use-timeline-thread-stats'
export { toEvent } from './hooks/ZionContext/useMatrixTimelines' // todo this doesn't need to be exposed  https://linear.app/hnt-labs/issue/HNT-44/client-update-usefixmemessagethread-implementation
export { useUser } from './hooks/use-user'
export { useZionClient } from './hooks/use-zion-client'

export { useFullyReadMarkerStore } from './store/use-fully-read-marker-store'
export { useMatrixStore } from './store/use-matrix-store'
export { useTimelineStore } from './store/use-timeline-store'

export type {
    Channel,
    ChannelGroup,
    CreateChannelInfo,
    CreateSpaceInfo,
    ImageMessageContent,
    Mention,
    PowerLevel,
    PowerLevels,
    PowerLevelDefinition,
    Room,
    RoomMember,
    Rooms,
    SendMessageOptions,
    SendTextMessageOptions,
    SpaceChild,
    SpaceData,
    SpaceItem,
    MessageContent,
    ZionTextMessageContent,
} from './types/matrix-types'

export { Membership, MessageType, RoomVisibility } from './types/matrix-types'

export type { RoomIdentifier } from './types/room-identifier'
export { makeRoomIdentifier, toRoomIdentifier } from './types/room-identifier'

export type {
    FullyReadMarker,
    MentionResult,
    MessageReactions,
    RoomCanonicalAliasEvent,
    RoomHistoryVisibilityEvent,
    RoomJoinRulesEvent,
    RoomAvatarEvent,
    RoomCreateEvent,
    RoomMemberEvent,
    RoomMessageEncryptedEvent,
    RoomMessageEvent,
    RoomNameEvent,
    RoomPowerLevelsEvent,
    SpaceChildEvent,
    SpaceParentEvent,
    ThreadResult,
    ThreadStats,
    TimelineEvent,
    TimelineEvent_OneOf,
} from './types/timeline-types'

export { ZTEvent } from './types/timeline-types'

export { WalletStatus } from './types/web3-types'

export type { UserIdentifier } from './types/user-identifier'

export {
    createUserIdFromEthereumAddress,
    createUserIdFromString,
    getShortUsername,
    getUsernameFromId,
    isUserIdentifier,
} from './types/user-identifier'

export { Permission } from './client/web3/ContractTypes'
export {
    getCouncilNftAddress,
    getFilteredRolesFromSpace,
    getZioneerNftAddress,
} from './client/web3/ContractHelpers'

export { staticAssertNever } from './utils/zion-utils'

export * from './client/web3/ZioneerNFT'
