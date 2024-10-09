/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/unbound-method */
import { useCallback, useMemo } from 'react'
import { FullyReadMarker, type ChunkedMedia, UserBio } from '@river-build/proto'
import { PlainMessage } from '@bufbuild/protobuf'
import {
    BanUnbanWalletTransactionContext,
    ChannelTransactionContext,
    ChannelUpdateTransactionContext,
    CreateSpaceFlowStatus,
    CreateSpaceTransactionContext,
    ITownsServerVersions,
    PrepayMembershipTransactionContext,
    RoleTransactionContext,
    TransactionContext,
    TransferAssetTransactionContext,
    WalletLinkTransactionContext,
} from '../client/TownsClientTypes'
import {
    CreateChannelInfo,
    CreateSpaceInfo,
    MediaStreamBlockInfo,
    SendMessageOptions,
    SendTextMessageOptions,
    StreamView,
    UpdateChannelInfo,
} from '../types/towns-types'
import { RoomMessageEvent } from '../types/timeline-types'
import { TownsClient } from '../client/TownsClient'
import { useLogout } from './use-logout'
import { useResetFullyReadMarkers } from './TownsContext/useResetFullyReadMarkers'
import { useSendReadReceipt } from './TownsContext/useSendReadReceipt'
import { useTownsContext } from '../components/TownsContextProvider'
import {
    CasablancaSignInCallbacks,
    useCasablancaWalletSignIn,
} from './use-casablanca-wallet-signin'
import { create } from 'zustand'
import { MembershipStruct, Permission, IRuleEntitlementV2Base } from '@river-build/web3'
import { TSigner } from 'types/web3-types'
import { SignerContext } from '@river-build/sdk'
import { UserOps } from '@towns/userops'

export type TownsErrorStoreState = {
    errors: string[]
    appendError: (error: string) => void
}

export const useTownsErrorStore = create<TownsErrorStoreState>((set) => ({
    errors: [],
    appendError: (error: string) =>
        set((state) => ({
            errors: [...state.errors, error],
        })),
}))

/**
 * client API to interact with the river server.
 */
interface TownsClientImpl {
    chainId: number | undefined
    client: TownsClient | undefined
    clientRunning: boolean
    clientSingleton: TownsClient | undefined
    signerContext: SignerContext | undefined
    spaceDapp: TownsClient['spaceDapp'] | undefined
    createSpaceTransaction: (
        createSpaceInfo: CreateSpaceInfo,
        membership: MembershipStruct,
        signer: TSigner | undefined,
        onCreateFlowStatus?: (update: CreateSpaceFlowStatus) => void,
    ) => Promise<CreateSpaceTransactionContext | undefined>
    waitForCreateSpaceTransaction: (
        context: CreateSpaceTransactionContext | undefined,
        defaultUsernames: string[],
        onCreateSpaceFlowStatus?: (update: CreateSpaceFlowStatus) => void,
    ) => Promise<CreateSpaceTransactionContext | undefined>
    createChannelTransaction: (
        createChannelInfo: CreateChannelInfo,
        signer: TSigner | undefined,
    ) => Promise<ChannelTransactionContext | undefined>
    waitForCreateChannelTransaction: (
        createChannelInfo: CreateChannelInfo,
        context: ChannelTransactionContext | undefined,
    ) => Promise<ChannelTransactionContext | undefined>
    updateChannelTransaction: (
        updateChannelInfo: UpdateChannelInfo,
        signer: TSigner | undefined,
    ) => Promise<ChannelUpdateTransactionContext | undefined>
    setChannelPermissionOverridesTransaction: (
        spaceNetworkId: string,
        channelId: string,
        roleId: number,
        permissions: Permission[],
        signer: TSigner | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForSetChannelPermissionOverridesTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    clearChannelPermissionOverridesTransaction: (
        spaceNetworkId: string,
        channelId: string,
        roleId: number,
        signer: TSigner | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForClearChannelPermissionOverridesTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    banTransaction: (
        spaceNetworkId: string,
        walletAddress: string,
        signer: TSigner,
    ) => Promise<BanUnbanWalletTransactionContext | undefined>
    unbanTransaction: (
        spaceNetworkId: string,
        walletAddress: string,
        signer: TSigner,
    ) => Promise<BanUnbanWalletTransactionContext | undefined>
    editSpaceMembershipTransaction: (
        args: Parameters<UserOps['sendEditMembershipSettingsOp']>[0],
    ) => Promise<TransactionContext<void> | undefined>
    waitForEditSpaceMembershipTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    walletAddressIsBanned(spaceId: string, walletAddress: string): Promise<boolean | undefined>
    waitForBanUnbanTransaction: (
        context: BanUnbanWalletTransactionContext,
    ) => Promise<BanUnbanWalletTransactionContext | undefined>
    createDMChannel: (userId: string) => Promise<string | undefined>
    createGDMChannel: (userIds: string[]) => Promise<string | undefined>
    waitForUpdateChannelTransaction: (
        context: ChannelUpdateTransactionContext | undefined,
    ) => Promise<ChannelUpdateTransactionContext | undefined>
    createMediaStream: (
        channelId: string | undefined,
        spaceId: string | undefined,
        userId: string | undefined,
        chunkCount: number,
    ) => Promise<MediaStreamBlockInfo | undefined>
    createRoleTransaction: (
        spaceNetworkId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
        signer: TSigner | undefined,
    ) => Promise<RoleTransactionContext | undefined>
    waitForCreateRoleTransaction: (
        context: RoleTransactionContext | undefined,
    ) => Promise<RoleTransactionContext | undefined>
    addRoleToChannelTransaction: (
        spaceNetworkId: string,
        channelNetworkId: string,
        roleId: number,
        signer: TSigner | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForAddRoleToChannelTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    updateRoleTransaction: (
        spaceNetworkId: string,
        roleId: number,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
        signer: TSigner | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForUpdateRoleTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForUpdateSpaceInfoTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    deleteRoleTransaction: (
        spaceNetworkId: string,
        roleId: number,
        signer: TSigner | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForDeleteRoleTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    editMessage: (
        roomId: string,
        eventId: string,
        originalEventContent: RoomMessageEvent,
        message: string,
        options: SendTextMessageOptions | undefined,
    ) => Promise<void>
    getIsUsernameAvailable: (streamId: string, username: string) => Promise<boolean | undefined>
    getIsWalletRegisteredWithCasablanca: () => Promise<boolean>
    getServerVersions: () => Promise<ITownsServerVersions | undefined>
    getSupportedXChainIds: () => Promise<number[] | undefined>
    getUserProfileImage: (userId: string) => Promise<ChunkedMedia | undefined>
    updateUserBlock: (userId: string, isBlocked: boolean) => Promise<void>
    inviteUser: (roomId: string, userId: string) => Promise<void>
    joinRoom: (roomId: string, parentNetworkId?: string) => Promise<StreamView | undefined>
    leaveRoom: (roomId: string, parentNetworkId?: string) => Promise<void>
    logout: () => Promise<void>
    loginWithWalletToCasablanca: (
        statement: string,
        signer: TSigner,
        cbs?: CasablancaSignInCallbacks,
    ) => Promise<void>
    joinTown: (spaceId: string, signer: TSigner) => Promise<StreamView | undefined>
    pinMessage: (roomId: string, eventId: string) => Promise<void>
    unpinMessage: (roomId: string, eventId: string) => Promise<void>
    redactEvent: (roomId: string, eventId: string, reason?: string) => Promise<void>
    registerWalletWithCasablanca: (statement: string, signer: TSigner) => Promise<void>
    removeUser: (streamId: string, userId: string) => Promise<void>
    resetFullyReadMarkers: () => void
    scrollback: (roomId: string) => Promise<
        | {
              terminus: boolean
              eventCount: number
              firstEventId?: string
              firstEventTimestamp?: number
          }
        | undefined
    >
    scrollbackToEvent: (
        roomId: string,
        eventId: string,
        limit: number,
    ) => Promise<boolean | undefined>
    sendMessage: (roomId: string, message: string, options?: SendMessageOptions) => Promise<void>
    adminRedactMessage: (roomId: string, eventId: string) => Promise<void>
    retrySendMessage: (roomId: string, localEventId: string) => Promise<void>
    sendReaction: (
        roomId: string,
        eventId: string,
        reaction: string,
        threadId?: string,
    ) => Promise<void>
    sendMediaPayload: (
        streamId: string,
        data: Uint8Array,
        chunkIndex: number,
        prevMiniblockHash: Uint8Array,
    ) => Promise<{ prevMiniblockHash: Uint8Array; eventId: string } | undefined>
    sendReadReceipt: (marker: FullyReadMarker, isUnread?: boolean) => Promise<void>
    setAvatarUrl: (ravatarUrl: string) => Promise<void>
    setRoomProperties: (roomId: string, title: string, topic: string) => Promise<void>
    setDisplayName: (streamId: string, displayName: string) => Promise<void>
    setHighPriorityStreams: (streamIds: string[]) => Promise<void>
    setUserProfileImage: (chunkedMedia: PlainMessage<ChunkedMedia>) => Promise<void>
    setUserBio: (bio: UserBio) => Promise<void>
    refreshMetadataTransaction: (
        spaceId: string,
        signer: TSigner,
    ) => Promise<TransactionContext<void> | undefined>
    waitForRefreshMetadataTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    updateSpaceInfoTransaction: (
        spaceId: string,
        name: string,
        uri: string,
        shortDescription: string,
        longDescription: string,
        signer: TSigner | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    linkEOAToRootKey: (
        rootKey: TSigner,
        wallet: TSigner,
    ) => Promise<WalletLinkTransactionContext | undefined>
    linkCallerToRootKey: (
        rootKey: TSigner,
        wallet?: TSigner,
    ) => Promise<WalletLinkTransactionContext | undefined>
    removeLink: (
        rootKey: TSigner,
        walletAddress: string,
    ) => Promise<WalletLinkTransactionContext | undefined>
    getLinkedWallets: (rootKey: string) => Promise<string[] | undefined>
    waitWalletLinkTransaction: (
        transactionContext: WalletLinkTransactionContext,
    ) => Promise<WalletLinkTransactionContext | undefined>
    prepayMembershipTransaction: (
        spaceId: string,
        supply: number,
        signer: TSigner,
    ) => Promise<PrepayMembershipTransactionContext | undefined>
    waitForPrepayMembershipTransaction: (
        context: PrepayMembershipTransactionContext | undefined,
    ) => Promise<PrepayMembershipTransactionContext | undefined>
    transferAsset: (
        transferData: NonNullable<TransferAssetTransactionContext['data']>,
        signer: TSigner,
    ) => Promise<TransferAssetTransactionContext | undefined>
    waitForTransferAssetTransaction: (
        transactionContext: TransferAssetTransactionContext,
    ) => Promise<TransferAssetTransactionContext | undefined>
}

export function useTownsClient(): TownsClientImpl {
    const {
        getIsWalletRegisteredWithCasablanca,
        loginWithWalletToCasablanca,
        registerWalletWithCasablanca,
    } = useCasablancaWalletSignIn()
    const { client, clientSingleton, signerContext } = useTownsContext()
    const clientRunning = useMemo(() => signerContext !== undefined, [signerContext])
    const logout = useLogout()
    const sendReadReceipt = useSendReadReceipt(client)
    const resetFullyReadMarkers = useResetFullyReadMarkers()
    const joinTown = useCallback(
        // if you call join town before you have a user in the stream node
        // join town will initialize your user after you have have minted in the space contract
        // capture and pass the space context here
        (spaceId: string, signer: TSigner) => {
            if (!clientSingleton) {
                console.error('clientSingleton is undefined')
                return Promise.resolve(undefined)
            }
            return clientSingleton.joinTown(spaceId, signer, signerContext)
        },
        [clientSingleton, signerContext],
    )
    const waitForCreateSpaceTransaction = useCallback(
        // if you call join town before you have a user in the stream node
        // join town will initialize your user after you have have minted in the space contract
        // capture and pass the space context here
        (
            context: CreateSpaceTransactionContext | undefined,
            defaultUsernames: string[],
            onCreateSpaceFlowStatus?: (status: CreateSpaceFlowStatus) => void,
        ) => {
            if (!clientSingleton) {
                console.error('clientSingleton is undefined')
                return Promise.resolve(undefined)
            }
            return clientSingleton.waitForCreateSpaceTransaction(
                context,
                signerContext,
                defaultUsernames,
                onCreateSpaceFlowStatus,
            )
        },
        [clientSingleton, signerContext],
    )

    return {
        chainId: client?.opts.baseChainId,
        client,
        clientRunning,
        clientSingleton,
        spaceDapp: clientSingleton?.spaceDapp,
        signerContext,
        createSpaceTransaction: useWithCatch(clientSingleton?.createSpaceTransaction),
        waitForCreateSpaceTransaction,
        createMediaStream: useWithCatch(clientSingleton?.createMediaStream),

        createChannelTransaction: useWithCatch(clientSingleton?.createChannelTransaction),
        waitForCreateChannelTransaction: useWithCatch(
            clientSingleton?.waitForCreateChannelTransaction,
        ),
        updateChannelTransaction: useWithCatch(clientSingleton?.updateChannelTransaction),
        setChannelPermissionOverridesTransaction: useWithCatch(
            clientSingleton?.setChannelPermissionOverridesTransaction,
        ),
        waitForSetChannelPermissionOverridesTransaction: useWithCatch(
            clientSingleton?.waitForSetChannelPermissionOverridesTransaction,
        ),
        clearChannelPermissionOverridesTransaction: useWithCatch(
            clientSingleton?.clearChannelPermissionOverridesTransaction,
        ),
        waitForClearChannelPermissionOverridesTransaction: useWithCatch(
            clientSingleton?.waitForSetChannelPermissionOverridesTransaction,
        ),
        waitForUpdateChannelTransaction: useWithCatch(
            clientSingleton?.waitForUpdateChannelTransaction,
        ),
        banTransaction: useWithCatch(clientSingleton?.banTransaction),
        unbanTransaction: useWithCatch(clientSingleton?.unbanTransaction),
        waitForBanUnbanTransaction: useWithCatch(clientSingleton?.waitForBanUnbanTransaction),
        walletAddressIsBanned: useWithCatch(clientSingleton?.walletAddressIsBanned),
        createDMChannel: useWithCatch(clientSingleton?.createDMChannel),
        createGDMChannel: useWithCatch(clientSingleton?.createGDMChannel),
        createRoleTransaction: useWithCatch(clientSingleton?.createRoleTransaction),
        waitForCreateRoleTransaction: useWithCatch(clientSingleton?.waitForCreateRoleTransaction),
        addRoleToChannelTransaction: useWithCatch(clientSingleton?.addRoleToChannelTransaction),
        waitForAddRoleToChannelTransaction: useWithCatch(
            clientSingleton?.waitForAddRoleToChannelTransaction,
        ),
        updateRoleTransaction: useWithCatch(clientSingleton?.updateRoleTransaction),
        waitForUpdateRoleTransaction: useWithCatch(clientSingleton?.waitForUpdateRoleTransaction),
        deleteRoleTransaction: useWithCatch(clientSingleton?.deleteRoleTransaction),
        waitForDeleteRoleTransaction: useWithCatch(clientSingleton?.waitForDeleteRoleTransaction),
        waitForUpdateSpaceInfoTransaction: useWithCatch(
            clientSingleton?.waitForUpdateSpaceInfoTransaction,
        ),
        updateSpaceInfoTransaction: useWithCatch(clientSingleton?.updateSpaceInfoTransaction),
        editSpaceMembershipTransaction: useWithCatch(
            clientSingleton?.editSpaceMembershipTransaction,
        ),
        waitForEditSpaceMembershipTransaction: useWithCatch(
            clientSingleton?.waitForEditSpaceMembershipTransaction,
        ),
        editMessage: useWithCatch(clientSingleton?.editMessage),
        getIsUsernameAvailable: useWithCatch(clientSingleton?.getIsUsernameAvailable),
        getIsWalletRegisteredWithCasablanca,
        getServerVersions: useWithCatch(clientSingleton?.getServerVersions),
        getUserProfileImage: useWithCatch(clientSingleton?.getUserProfileImage),
        updateUserBlock: useWithCatch(clientSingleton?.updateUserBlock),
        inviteUser: useWithCatch(clientSingleton?.inviteUser),
        joinRoom: useWithCatch(clientSingleton?.joinRoom),
        leaveRoom: useWithCatch(clientSingleton?.leave),
        loginWithWalletToCasablanca,
        logout,
        joinTown,
        pinMessage: useWithCatch(clientSingleton?.pinMessage),
        unpinMessage: useWithCatch(clientSingleton?.unpinMessage),
        redactEvent: useWithCatch(clientSingleton?.redactEvent),
        registerWalletWithCasablanca,
        removeUser: useWithCatch(clientSingleton?.removeUser),
        resetFullyReadMarkers,
        scrollback: useWithCatch(clientSingleton?.scrollback),
        scrollbackToEvent: useWithCatch(clientSingleton?.scrollbackToEvent),
        sendMessage: useWithCatch(clientSingleton?.sendMessage),
        retrySendMessage: useWithCatch(clientSingleton?.retrySendMessage),
        sendReaction: useWithCatch(clientSingleton?.sendReaction),
        sendMediaPayload: useWithCatch(clientSingleton?.sendMediaPayload),
        sendReadReceipt: useWithCatch(sendReadReceipt),
        adminRedactMessage: useWithCatch(clientSingleton?.adminRedactMessage),
        setDisplayName: useWithCatch(clientSingleton?.setDisplayName),
        setRoomProperties: useWithCatch(clientSingleton?.setRoomProperties),
        setAvatarUrl: useWithCatch(clientSingleton?.setAvatarUrl),
        setHighPriorityStreams: useWithCatch(clientSingleton?.setHighPriorityStreams),
        setUserProfileImage: useWithCatch(clientSingleton?.setUserProfileImage),
        setUserBio: useWithCatch(clientSingleton?.setUserBio),
        linkEOAToRootKey: useWithCatch(clientSingleton?.linkEOAToRootKey),
        linkCallerToRootKey: useWithCatch(clientSingleton?.linkCallerToRootKey),
        removeLink: useWithCatch(clientSingleton?.removeLink),
        getLinkedWallets: useWithCatch(clientSingleton?.getLinkedWallets),
        waitWalletLinkTransaction: useWithCatch(clientSingleton?.waitWalletLinkTransaction),
        getSupportedXChainIds: useWithCatch(clientSingleton?.getSupportedXChainIds),
        prepayMembershipTransaction: useWithCatch(clientSingleton?.prepayMembershipTransaction),
        waitForPrepayMembershipTransaction: useWithCatch(
            clientSingleton?.waitForPrepayMembershipTransaction,
        ),
        transferAsset: useWithCatch(clientSingleton?.transferAsset),
        waitForTransferAssetTransaction: useWithCatch(
            clientSingleton?.waitForTransferAssetTransaction,
        ),
        refreshMetadataTransaction: useWithCatch(clientSingleton?.refreshMetadataTransaction),
        waitForRefreshMetadataTransaction: useWithCatch(
            clientSingleton?.waitForRefreshMetadataTransaction,
        ),
    }
}

const useWithCatch = <T extends Array<unknown>, U>(
    fn?: (...args: T) => Promise<U | undefined>,
): ((...args: T) => Promise<U | undefined>) => {
    const client = useTownsContext().clientSingleton
    return useMemo(
        () =>
            async (...args: T): Promise<U | undefined> => {
                if (fn && client) {
                    try {
                        const value = await fn.apply(client, args)
                        return value
                    } catch (err) {
                        // just give up
                        console.error('Not a retryable error', err)
                        return
                    }
                } else {
                    console.error('client or fn is undefined', { fn, client })
                }
            },
        [fn, client],
    )
}
