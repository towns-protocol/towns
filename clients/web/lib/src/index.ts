export type {
    Space,
    SpaceIdentifier,
    TipTransactionContext,
    TransactionContext,
    TransferAssetTransactionContext,
} from './client/TownsClientTypes'
export { TransactionStatus, CreateSpaceFlowStatus } from './client/TownsClientTypes'
export * from './client/TownsNotifciationSettings'
export { ChannelContextProvider, useChannelContext } from './components/ChannelContextProvider'
export { QueryProvider } from './components/QueryProvider'
export * from './components/SpaceContextProvider'
export {
    TownsContextProvider,
    useTownsContext,
    TownsContext,
    type InitialSyncSortPredicate,
} from './components/TownsContextProvider'
export type { DMChannelIdentifier } from './types/dm-channel-identifier'
export * from './components/UserLookupContextProviders'

export type { TownsAnalytics } from './types/TownsAnalytics'
export { AuthStatus } from './hooks/login'
export type * from './types/user-lookup'
export type { LookupUserFn } from './hooks/use-user-lookup-context'
export * from './hooks/use-user-lookup-context'
export { useCasablancaCredentials } from './hooks/use-casablanca-credentials'
export * from './hooks/use-channel-data'
export { useChannelSettings } from './hooks/use-channel-settings'
export { useChannelId } from './hooks/use-channel-id'
export { useChannelMembers } from './hooks/use-channel-members'
export { useChannelNotificationCounts } from './hooks/use-channel-notification-counts'
export { useChannelThread } from './hooks/use-channel-thread'
export { useChannelTimeline } from './hooks/use-channel-timeline'
export { useChannelThreadStat } from './hooks/use-channel-thread-stat'
export { useChannelThreadStats } from './hooks/use-channel-thread-stats'
export * from './hooks/use-chunked-media'
export { useChunkedMedia, useDownloadFile } from './hooks/use-chunked-media'
export {
    useClearChannelPermissionOverrides,
    useSetChannelPermissionOverrides,
} from './hooks/use-set-channel-permission-overrides'
export { useCreateChannelTransaction } from './hooks/use-create-channel-transaction'
export { useCreateRoleTransaction } from './hooks/use-create-role-transaction'
export { useCreateSpaceTransaction } from './hooks/use-create-space-transaction'
export { useConnectivity } from './hooks/use-connectivity'
export { useDeleteRoleTransaction } from './hooks/use-delete-role-transaction'
export * from './hooks/use-dm-latest-message'
export { useDMLatestMessage } from './hooks/use-dm-latest-message'
export type { MostRecentMessageInfo_OneOf } from './hooks/use-dm-latest-message'
export { useDMData } from './hooks/use-dm-data'
export { useFavIconBadge, useAppBadge } from './hooks/TownsContext/useFavIconBadge'
export { useFullyReadMarker } from './hooks/use-fully-read-marker'
export { useMembershipInfo } from './hooks/use-membership-info'
export { useIsSpaceOwner } from './hooks/use-is-space-owner'
export { useHasPermission, useFetchHasJoinPermission } from './hooks/use-has-permission'
export { useMemberOf } from './hooks/use-member-of'
export { useMembers } from './hooks/use-members'
export { useMembership } from './hooks/use-membership'
export * from './hooks/use-my-channels'
export { useMutationSpaceInfoCache } from './hooks/use-mutation-space-info-cache'
export { useMyDefaultUsernames } from './hooks/use-my-default-usernames'
export { useMyMembership } from './hooks/use-my-membership'
export { useMyMemberships } from './hooks/use-my-memberships'
export { useMyProfile } from './hooks/use-my-profile'
export { useMyUserId } from './hooks/use-my-user-id'
export { useNetworkStatus } from './hooks/use-network-status'
export * from './hooks/use-pins'
export { usePermissionOverrides } from './hooks/use-permission-overrides'
export * from './hooks/use-role-details'
export {
    usePlatformMembershipFee,
    usePlatformMembershipPriceForSupplyInEth,
} from './hooks/use-platform-membership-fee'
export { useRoles } from './hooks/use-roles'
export { useRoom } from './hooks/use-room'
export * from './hooks/use-set-channel-permission-overrides'
export {
    useSpaceData,
    useSpaceDataStore,
    useSpaceDataWithId,
    useContractSpaceInfo,
    useContractSpaceInfoWithoutClient,
} from './hooks/use-space-data'
export { useSpaceDapp } from './hooks/use-space-dapp'
export * from './hooks/use-space-id'
export { useSpaceMembers, useSpaceMembersWithFallback } from './hooks/use-space-members'
export * from './hooks/use-space-mentions'
export { useSpaceNotificationCounts } from './hooks/use-space-notification-counts'
export { useSpaceUnread } from './hooks/use-space-unread'
export { useSpaceTimeline } from './hooks/use-space-timeline'
export { useSpaceThreadRoots, useSpaceThreadRootsUnreadCount } from './hooks/use-space-thread-roots'
export { useSpacesFromContract, useSpaceFromContract } from './hooks/use-spaces-from-contract'
export { useStreamEncryptionAlgorithm } from './hooks/use-stream-encryption-algorithm'
export { useStreamUpToDate } from './hooks/use-stream-up-to-date'
export { useTimeline } from './hooks/use-timeline'
export { useTimelineReactions } from './hooks/use-timeline-reactions'
export { useTimelineTips } from './hooks/use-timeline-tips'
export { useTimelineThread } from './hooks/use-timeline-thread'
export { useTimelineThreadStats } from './hooks/use-timeline-thread-stats'
export { useUpdateChannelTransaction } from './hooks/use-update-channel-transaction'
export { useUpdateRoleTransaction } from './hooks/use-update-role-transaction'
export { useUpdateSpaceInfoTransaction } from './hooks/use-update-space-info-transaction'
export { useEditSpaceMembershipTransaction } from './hooks/use-edit-space-membership-transaction'
export { useUser } from './hooks/use-user'
export * from './hooks/use-banning'
export { useBlockedUsers } from './hooks/use-blocked-users'
export { useTownsClient } from './hooks/use-towns-client'
export {
    useLinkEOAToRootKeyTransaction,
    useLinkCallerToRootKey,
    useUnlinkWalletTransaction,
    useUnlinkViaCallerTransaction,
    useLinkedWallets,
    useLinkedWalletsForWallet,
    useGetRootKeyFromLinkedWallet,
} from './hooks/use-linked-wallets'
export { useHasMemberNft } from './hooks/use-has-member-nft'
export { usePricingModules, usePricingModuleForMembership } from './hooks/use-pricing-modules'
export { useSupportedXChainIds } from './hooks/use-supported-xchain-ids'
export { useUnjoinedChannelMembers } from './hooks/use-unjoined-channel-members'
export { usePrepayMembershipTransaction } from './hooks/use-prepay-membership-transaction'
export { usePrepaidSupply } from './hooks/use-prepaid-supply'
export {
    usePlatformMinMembershipPrice,
    getPlatformMinMembershipPriceFromQueryCache,
} from './hooks/use-platform-min-membership-price'
export { useMembershipFreeAllocation } from './hooks/use-membership-free-allocation'
export { usePlatformMintLimit } from './hooks/use-platform-mint-limit'
export { useSetChannelAutojoin } from './hooks/use-set-channel-autojoin'
export { useSetHideUserJoinLeave } from './hooks/use-set-hide-user-join-leave'
export { useTransferAssetTransaction } from './hooks/use-transfer-asset-transaction'
export { useTipTransaction } from './hooks/use-tip-transaction'
export { useCheckInTransaction } from './hooks/use-checkin-transaction'
export { useSpaceTips } from './hooks/use-space-tips'
export { useTokenIdOfOwner } from './hooks/use-token-id-of-owner'
export { useProtocolFee } from './hooks/use-protocol-fee'
export { useReviewTransaction } from './hooks/use-review-transaction'

export { useCasablancaStore } from './store/use-casablanca-store'
export { useFullyReadMarkerStore } from './store/use-fully-read-marker-store'
export * from './store/use-timeline-store'
export { useOfflineStore, generateOfflineUserKey } from './store/use-offline-store'
export * from './store/use-timeline-filter'
export * from './store/use-transactions-store'
export type { BlockchainStoreTx } from './client/BlockchainTransactionStore'
export { staleTime24Hours, queryClient } from './query/queryClient'
export { blockchainKeys as blockchainQueryKeys } from './query/query-keys'

export * from './types/towns-types'
export { toRoomIdentifier } from './types/room-identifier'
export { toMessageInfo } from './hooks/use-dm-latest-message'
export { useStreamMetadataUpdater } from './hooks/use-stream-metadata-updater'
export { useRefreshMetadataTx } from './hooks/use-refresh-metadata'
export * from './hooks/use-river-points'
export { useImageStore } from './store/use-image-store'
export * from './types/timeline-types'
export {
    WalletStatus,
    BlockchainTransactionType,
    isNullAddress,
    type TSigner,
    type IChainConfig,
    NULL_ADDRESS,
} from './types/web3-types'
export { getAccountAddress } from './types/user-identifier'
export {
    signMessageAbortController,
    signMessageAbortListener,
} from './client/SignMessageAbortController'
export { useUserLookupStore } from './store/use-user-lookup-store'

export * from './types/error-types'
export * from './utils/towns-utils'
export * from './utils/crypto-utils'
export * from './utils/provider-utils'

// buffer hack required for casalanca: https://github.com/randlabs/myalgo-connect/issues/27
import buffer from 'buffer'
const { Buffer } = buffer

// ...
if (typeof window !== 'undefined' && !window.Buffer) {
    window.Buffer = Buffer
}

export * from '@river-build/web3'
export * from './types/notification-types'
