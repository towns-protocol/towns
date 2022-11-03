export type { Space, SpaceIdentifier } from './client/ZionClientTypes'

export { ChannelContextProvider, useChannelContext } from './components/ChannelContextProvider'
export { SpaceContextProvider, useSpaceContext } from './components/SpaceContextProvider'
export { ZionContextProvider, useZionContext } from './components/ZionContextProvider'
export { useWeb3Context } from './components/Web3ContextProvider'

export { LoginStatus } from './hooks/login'
export { useChannelData } from './hooks/use-channel-data'
export { useChannelId } from './hooks/use-channel-id'
export { useChannelMembers } from './hooks/use-channel-members'
export { useChannelTimeline } from './hooks/use-channel-timeline'
export { useIntegratedSpaceManagement } from './hooks/use-integrated-space-management'
export { useMember } from './hooks/use-member'
export { useMembers } from './hooks/use-members'
export { useMembership } from './hooks/use-membership'
export { useMyMembership } from './hooks/use-my-membership'
export { useMyProfile } from './hooks/use-my-profile'
export { useMyUserId } from './hooks/use-my-user-id'
export { usePowerLevels } from './hooks/use-power-levels'
export { useRoom } from './hooks/use-room'
export { useServerVersions } from './hooks/use-server-versions'
export { useSpaceData, useInvites, useInvitesForSpace, useInviteData } from './hooks/use-space-data'
export { useSpaceId } from './hooks/use-space-id'
export { useSpaceMembers } from './hooks/use-space-members'
export { useSpaceTimeline } from './hooks/use-space-timeline'
export { useSpacesFromContract } from './hooks/use-spaces-from-contract'
export { toEvent } from './hooks/ZionContext/useMatrixTimelines' // todo this doesn't need to be exposed  https://linear.app/hnt-labs/issue/HNT-44/client-update-usefixmemessagethread-implementation
export { useUser } from './hooks/use-user'
export { useZionClient } from './hooks/use-zion-client'

export { useMatrixStore } from './store/use-matrix-store'

export type {
    Channel,
    ChannelGroup,
    CreateChannelInfo,
    CreateSpaceInfo,
    ImageMessageContent,
    PowerLevel,
    PowerLevels,
    PowerLevelDefinition,
    Room,
    RoomIdentifier,
    RoomMember,
    Rooms,
    SendMessageOptions,
    SpaceChild,
    SpaceData,
    SpaceItem,
    MessageContent,
    ZionTextMessageContent,
} from './types/matrix-types'

export {
    isRoom,
    makeRoomIdentifier,
    Membership,
    MessageType,
    RoomVisibility,
} from './types/matrix-types'

export type {
    TimelineEvent,
    TimelineEvent_OneOf,
    RoomCanonicalAliasEvent,
    RoomHistoryVisibilityEvent,
    RoomJoinRulesEvent,
    RoomAvatarEvent,
    RoomCreateEvent,
    RoomMemberEvent,
    RoomMessageEvent,
    RoomNameEvent,
    RoomPowerLevelsEvent,
    SpaceChildEvent,
    SpaceParentEvent,
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

export { staticAssertNever } from './utils/zion-utils'
