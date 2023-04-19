export type { Space, SpaceIdentifier, TransactionContext } from './client/ZionClientTypes'
export { TransactionStatus, SpaceProtocol } from './client/ZionClientTypes'

export { ChannelContextProvider, useChannelContext } from './components/ChannelContextProvider'
export { QueryProvider } from './components/QueryProvider'
export * from './components/SpaceContextProvider'
export { ZionContextProvider, useZionContext, ZionContext } from './components/ZionContextProvider'
export { useWeb3Context } from './components/Web3ContextProvider'
export { AutojoinChannels } from './components/AutojoinChannels'

export { LoginStatus } from './hooks/login'
export * from './hooks/ZionContext/onboarding/IOnboardingState'
export { useCasablancaCredentials } from './hooks/use-casablanca-credentials'
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
export { useCreateRoleTransaction } from './hooks/use-create-role-transaction'
export { useCreateSpaceTransaction } from './hooks/use-create-space-transaction'
export { useDeleteRoleTransaction } from './hooks/use-delete-role-transaction'
export { useFullyReadMarker } from './hooks/use-fully-read-marker'
export { useMatrixCredentials } from './hooks/use-matrix-credentials'
export { useMember } from './hooks/use-member'
export { useMembers } from './hooks/use-members'
export { useMembership } from './hooks/use-membership'
export { useMyMembership } from './hooks/use-my-membership'
export { useMyProfile } from './hooks/use-my-profile'
export { usePowerLevels } from './hooks/use-power-levels'
export { useRoleDetails, useMultipleRoleDetails } from './hooks/use-role-details'
export { useRoles } from './hooks/use-roles'
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
export { useUpdateChannelTransaction } from './hooks/use-update-channel-transaction'
export { useUpdateRoleTransaction } from './hooks/use-update-role-transaction'
export { useUser } from './hooks/use-user'
export { useZionClient } from './hooks/use-zion-client'

export { useCasablancaStore } from './store/use-casablanca-store'
export { useFullyReadMarkerStore } from './store/use-fully-read-marker-store'
export { useMatrixStore } from './store/use-matrix-store'
export { useTimelineStore } from './store/use-timeline-store'
export { useTransactionStore } from './store/use-transactions-store'
export { TxnsEventEmitter, useOnTransactionEmitted } from './store/use-transactions-store'
export type { EmittedTransaction } from './store/use-transactions-store'

export * from './types/zion-types'
export { Membership, MessageType, RoomVisibility } from './types/zion-types'
export type { RoomIdentifier } from './types/room-identifier'
export { makeRoomIdentifier, toRoomIdentifier } from './types/room-identifier'
export * from './types/timeline-types'
export { WalletStatus, BlockchainTransactionType } from './types/web3-types'
export type { UserIdentifier } from './types/user-identifier'
export {
    createUserIdFromEthereumAddress,
    createUserIdFromString,
    getShortUsername,
    getUsernameFromId,
    isUserIdentifier,
} from './types/user-identifier'

export type { ISpaceDapp } from './client/web3/ISpaceDapp'
export * from './client/web3/ContractTypes'
export {
    getMemberNftAddress,
    getFilteredRolesFromSpace,
    getPioneerNftAddress,
} from './client/web3/ContractHelpers'

export * from './utils/zion-utils'

export * from './client/web3/PioneerNFT'

// buffer hack required for casalanca: https://github.com/randlabs/myalgo-connect/issues/27
import buffer from 'buffer'
const { Buffer } = buffer

// ...
if (!window.Buffer) {
    window.Buffer = Buffer
}
