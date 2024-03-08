/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/unbound-method */
import { useMemo } from 'react'
import { FullyReadMarker } from '@river/proto'
import {
    ChannelTransactionContext,
    ChannelUpdateTransactionContext,
    CreateSpaceTransactionContext,
    ITownsServerVersions,
    RoleTransactionContext,
    TransactionContext,
    WalletLinkTransactionContext,
} from '../client/TownsClientTypes'
import {
    CreateChannelInfo,
    CreateSpaceInfo,
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
import { useCasablancaWalletSignIn } from './use-casablanca-wallet-signin'
import { create } from 'zustand'
import { IArchitectBase, Permission, IRuleEntitlement } from '@river/web3'
import { TSigner } from 'types/web3-types'

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
    spaceDapp: TownsClient['spaceDapp'] | undefined
    createSpaceTransaction: (
        createSpaceInfo: CreateSpaceInfo,
        membership: IArchitectBase.MembershipStruct,
        signer: TSigner | undefined,
    ) => Promise<CreateSpaceTransactionContext | undefined>
    waitForCreateSpaceTransaction: (
        context: CreateSpaceTransactionContext | undefined,
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
    createDMChannel: (userId: string) => Promise<string | undefined>
    createGDMChannel: (userIds: string[]) => Promise<string | undefined>
    waitForUpdateChannelTransaction: (
        context: ChannelUpdateTransactionContext | undefined,
    ) => Promise<ChannelUpdateTransactionContext | undefined>
    createMediaStream: (
        channelId: string,
        spaceId: string | undefined,
        chunkCount: number,
    ) => Promise<{ streamId: string; prevMiniblockHash: Uint8Array } | undefined>
    createRoleTransaction: (
        spaceNetworkId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlement.RuleDataStruct,
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
        ruleData: IRuleEntitlement.RuleDataStruct,
        signer: TSigner | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForUpdateRoleTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForUpdateSpaceNameTransaction: (
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
    inviteUser: (roomId: string, userId: string) => Promise<void>
    joinRoom: (roomId: string, parentNetworkId?: string) => Promise<StreamView | undefined>
    leaveRoom: (roomId: string, parentNetworkId?: string) => Promise<void>
    logout: () => Promise<void>
    loginWithWalletToCasablanca: (statement: string, signer: TSigner) => Promise<void>
    joinTown: (spaceId: string, signer: TSigner) => Promise<StreamView | undefined>
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
    retrySendMessage: (roomId: string, localEventId: string) => Promise<void>
    sendReaction: (roomId: string, eventId: string, reaction: string) => Promise<void>
    sendMediaPayload: (
        streamId: string,
        data: Uint8Array,
        chunkIndex: number,
        prevMiniblockHash: Uint8Array,
    ) => Promise<{ prevMiniblockHash: Uint8Array } | undefined>
    sendReadReceipt: (marker: FullyReadMarker, isUnread?: boolean) => Promise<void>
    setAvatarUrl: (ravatarUrl: string) => Promise<void>
    setRoomProperties: (roomId: string, title: string, topic: string) => Promise<void>
    setDisplayName: (streamId: string, displayName: string) => Promise<void>
    setHighPriorityStreams: (streamIds: string[]) => Promise<void>
    updateSpaceNameTransaction: (
        spaceId: string,
        name: string,
        signer: TSigner | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    linkWallet: (
        rootKey: TSigner,
        wallet: TSigner,
    ) => Promise<WalletLinkTransactionContext | undefined>
    removeLink: (
        rootKey: TSigner,
        walletAddress: string,
    ) => Promise<WalletLinkTransactionContext | undefined>
    getLinkedWallets: (rootKey: string) => Promise<string[] | undefined>
    waitWalletLinkTransaction: (
        transactionContext: WalletLinkTransactionContext,
    ) => Promise<WalletLinkTransactionContext | undefined>
}

export function useTownsClient(): TownsClientImpl {
    const {
        getIsWalletRegisteredWithCasablanca,
        loginWithWalletToCasablanca,
        registerWalletWithCasablanca,
    } = useCasablancaWalletSignIn()
    const { client } = useTownsContext()
    const clientRunning = useMemo(() => client !== undefined, [client])
    const logout = useLogout()
    const sendReadReceipt = useSendReadReceipt(client)
    const resetFullyReadMarkers = useResetFullyReadMarkers()

    return {
        chainId: client?.opts.chainId,
        client,
        clientRunning,
        spaceDapp: client?.spaceDapp,
        createSpaceTransaction: useWithCatch(client?.createSpaceTransaction),
        waitForCreateSpaceTransaction: useWithCatch(client?.waitForCreateSpaceTransaction),
        createMediaStream: useWithCatch(client?.createMediaStream),

        createChannelTransaction: useWithCatch(client?.createChannelTransaction),
        waitForCreateChannelTransaction: useWithCatch(client?.waitForCreateChannelTransaction),
        updateChannelTransaction: useWithCatch(client?.updateChannelTransaction),
        waitForUpdateChannelTransaction: useWithCatch(client?.waitForUpdateChannelTransaction),
        createDMChannel: useWithCatch(client?.createDMChannel),
        createGDMChannel: useWithCatch(client?.createGDMChannel),
        createRoleTransaction: useWithCatch(client?.createRoleTransaction),
        waitForCreateRoleTransaction: useWithCatch(client?.waitForCreateRoleTransaction),
        addRoleToChannelTransaction: useWithCatch(client?.addRoleToChannelTransaction),
        waitForAddRoleToChannelTransaction: useWithCatch(
            client?.waitForAddRoleToChannelTransaction,
        ),
        updateRoleTransaction: useWithCatch(client?.updateRoleTransaction),
        waitForUpdateRoleTransaction: useWithCatch(client?.waitForUpdateRoleTransaction),
        deleteRoleTransaction: useWithCatch(client?.deleteRoleTransaction),
        waitForDeleteRoleTransaction: useWithCatch(client?.waitForDeleteRoleTransaction),
        waitForUpdateSpaceNameTransaction: useWithCatch(client?.waitForUpdateSpaceNameTransaction),
        updateSpaceNameTransaction: useWithCatch(client?.updateSpaceNameTransaction),
        editMessage: useWithCatch(client?.editMessage),
        getIsUsernameAvailable: useWithCatch(client?.getIsUsernameAvailable),
        getIsWalletRegisteredWithCasablanca,
        getServerVersions: useWithCatch(client?.getServerVersions),
        inviteUser: useWithCatch(client?.inviteUser),
        joinRoom: useWithCatch(client?.joinRoom),
        leaveRoom: useWithCatch(client?.leave),
        loginWithWalletToCasablanca,
        logout,
        joinTown: useWithCatch(client?.joinTown),
        redactEvent: useWithCatch(client?.redactEvent),
        registerWalletWithCasablanca,
        removeUser: useWithCatch(client?.removeUser),
        resetFullyReadMarkers,
        scrollback: useWithCatch(client?.scrollback),
        scrollbackToEvent: useWithCatch(client?.scrollbackToEvent),
        sendMessage: useWithCatch(client?.sendMessage),
        retrySendMessage: useWithCatch(client?.retrySendMessage),
        sendReaction: useWithCatch(client?.sendReaction),
        sendMediaPayload: useWithCatch(client?.sendMediaPayload),
        sendReadReceipt: useWithCatch(sendReadReceipt),
        setDisplayName: useWithCatch(client?.setDisplayName),
        setRoomProperties: useWithCatch(client?.setRoomProperties),
        setAvatarUrl: useWithCatch(client?.setAvatarUrl),
        setHighPriorityStreams: useWithCatch(client?.setHighPriorityStreams),
        linkWallet: useWithCatch(client?.linkWallet),
        removeLink: useWithCatch(client?.removeLink),
        getLinkedWallets: useWithCatch(client?.getLinkedWallets),
        waitWalletLinkTransaction: useWithCatch(client?.waitWalletLinkTransaction),
    }
}

const useWithCatch = <T extends Array<unknown>, U>(
    fn?: (...args: T) => Promise<U | undefined>,
): ((...args: T) => Promise<U | undefined>) => {
    const client = useTownsContext().client
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
                }
            },
        [fn, client],
    )
}
