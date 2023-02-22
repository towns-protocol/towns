/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/unbound-method */

import {
    ChannelTransactionContext,
    ChannelUpdateTransactionContext,
    IZionServerVersions,
    RoleTransactionContext,
    TransactionContext,
    ZionClientEvent,
} from '../client/ZionClientTypes'
import {
    CreateChannelInfo,
    CreateSpaceInfo,
    EditMessageOptions,
    PowerLevel,
    Room,
    SendMessageOptions,
    SendTextMessageOptions,
    UpdateChannelInfo,
} from '../types/zion-types'
import { MatrixError, MatrixEvent, MatrixScheduler } from 'matrix-js-sdk'
import { useCallback, useMemo } from 'react'

import { CouncilNFTShim } from '../client/web3/shims/CouncilNFTShim'
import { FullyReadMarker } from '../types/timeline-types'
import { ISpaceDapp } from 'client/web3/ISpaceDapp'
import { MatrixSpaceHierarchy } from '../client/matrix/SyncSpace'
import { Permission } from '../client/web3/ContractTypes'
import { RoleIdentifier } from 'types/web3-types'
import { RoomIdentifier } from '../types/room-identifier'
import { DataTypes as SpaceFactoryDataTypes } from '@harmony/contracts/localhost/typings/SpaceFactory'
import { ZionClient } from '../client/ZionClient'
import { useLogout } from './MatrixClient/useLogout'
import { useMatrixStore } from '../store/use-matrix-store'
import { useMatrixWalletSignIn } from './use-matrix-wallet-sign-in'
import { useResetFullyReadMarkers } from './ZionContext/useResetFullyReadMarkers'
import { useSendReadReceipt } from './ZionContext/useSendReadReceipt'
import { useZionContext } from '../components/ZionContextProvider'

/**
 * Matrix client API to interact with the Matrix server.
 */
interface ZionClientImpl {
    chainId: number | undefined
    client: ZionClient | undefined
    clientRunning: boolean
    councilNFT: CouncilNFTShim | undefined
    spaceDapp: ISpaceDapp | undefined
    createSpaceRoom: (createInfo: CreateSpaceInfo) => Promise<RoomIdentifier | undefined>
    createSpaceTransaction: (
        createSpaceInfo: CreateSpaceInfo,
        memberEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
        everyonePermissions: Permission[],
    ) => Promise<TransactionContext<RoomIdentifier> | undefined>
    waitForCreateSpaceTransaction: (
        context: TransactionContext<RoomIdentifier> | undefined,
    ) => Promise<TransactionContext<RoomIdentifier> | undefined>
    createChannelRoom: (createInfo: CreateChannelInfo) => Promise<RoomIdentifier | undefined>
    createChannel: (createInfo: CreateChannelInfo) => Promise<RoomIdentifier | undefined>
    createChannelTransaction: (
        createChannelInfo: CreateChannelInfo,
    ) => Promise<ChannelTransactionContext | undefined>
    waitForCreateChannelTransaction: (
        context: ChannelTransactionContext | undefined,
    ) => Promise<TransactionContext<RoomIdentifier> | undefined>
    updateChannelTransaction: (
        updateChannelInfo: UpdateChannelInfo,
    ) => Promise<ChannelUpdateTransactionContext | undefined>
    waitForUpdateChannelTransaction: (
        context: ChannelUpdateTransactionContext | undefined,
    ) => Promise<ChannelUpdateTransactionContext | undefined>
    createRoleTransaction: (
        spaceNetworkId: string,
        roleName: string,
        permissions: Permission[],
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
    ) => Promise<RoleTransactionContext | undefined>
    addRoleToChannelTransaction: (
        spaceNetworkId: string,
        channelNetworkId: string,
        roleId: number,
    ) => Promise<TransactionContext<void> | undefined>
    waitForAddRoleToChannelTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForCreateRoleTransaction: (
        context: RoleTransactionContext | undefined,
    ) => Promise<TransactionContext<RoleIdentifier> | undefined>
    updateRoleTransaction: (
        spaceNetworkId: string,
        roleId: number,
        roleName: string,
        permissions: Permission[],
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
    ) => Promise<TransactionContext<void> | undefined>
    waitForUpdateRoleTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    deleteRoleTransaction: (
        spaceNetworkId: string,
        roleId: number,
    ) => Promise<TransactionContext<void> | undefined>
    waitForDeleteRoleTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    editMessage: (
        roomId: RoomIdentifier,
        message: string,
        options: EditMessageOptions,
        SendTextMessageOptions: SendTextMessageOptions | undefined,
    ) => Promise<void>
    getIsWalletIdRegistered: () => Promise<boolean>
    getServerVersions: () => Promise<IZionServerVersions | undefined>
    inviteUser: (roomId: RoomIdentifier, userId: string) => Promise<void>
    isRoomEncrypted: (roomId: RoomIdentifier) => boolean | undefined
    joinRoom: (roomId: RoomIdentifier, parentNetworkId?: string) => Promise<Room | undefined>
    leaveRoom: (roomId: RoomIdentifier, parentNetworkId?: string) => Promise<void>
    logout: () => Promise<void>
    loginWithWallet: (statement: string) => Promise<void>
    redactEvent: (roomId: RoomIdentifier, eventId: string, reason?: string) => Promise<void>
    registerWallet: (statement: string) => Promise<void>
    resetFullyReadMarkers: () => void
    scrollback: (roomId: RoomIdentifier, limit?: number) => Promise<void>
    sendMessage: (
        roomId: RoomIdentifier,
        message: string,
        options?: SendMessageOptions,
    ) => Promise<void>
    sendReaction: (roomId: RoomIdentifier, eventId: string, reaction: string) => Promise<void>
    sendReadReceipt: (marker: FullyReadMarker) => Promise<void>
    setPowerLevel: (
        roomId: RoomIdentifier,
        current: string | PowerLevel,
        newValue: number,
    ) => Promise<void>
    setAvatarUrl: (ravatarUrl: string) => Promise<void>
    setDisplayName: (displayName: string) => Promise<void>
    syncSpace: (spaceId: RoomIdentifier) => Promise<MatrixSpaceHierarchy | undefined>
}

export function useZionClient(): ZionClientImpl {
    const { getIsWalletIdRegistered, loginWithWallet, registerWallet } = useMatrixWalletSignIn()
    const { client } = useZionContext()
    const clientRunning = useMemo(() => client !== undefined, [client])
    const logout = useLogout()
    const sendReadReceipt = useSendReadReceipt(client)
    const resetFullyReadMarkers = useResetFullyReadMarkers()
    const isRoomEncrypted = useCallback(
        (roomId: RoomIdentifier) => client?.isRoomEncrypted(roomId),
        [client],
    )

    return {
        chainId: client?.chainId,
        client,
        clientRunning,
        councilNFT: client?.councilNFT,
        spaceDapp: client?.spaceDapp,
        createChannelRoom: useWithCatch(client?.createChannelRoom),
        createSpaceRoom: useWithCatch(client?.createSpaceRoom),
        createSpaceTransaction: useWithCatch(client?.createSpaceTransaction),
        waitForCreateSpaceTransaction: useWithCatch(
            client?.waitForCreateSpaceTransaction,
            ZionClientEvent.NewSpace,
        ),
        createChannel: useWithCatch(client?.createChannel, ZionClientEvent.NewChannel),
        createChannelTransaction: useWithCatch(client?.createChannelTransaction),
        waitForCreateChannelTransaction: useWithCatch(
            client?.waitForCreateChannelTransaction,
            ZionClientEvent.NewChannel,
        ),
        updateChannelTransaction: useWithCatch(client?.updateChannelTransaction),
        waitForUpdateChannelTransaction: useWithCatch(
            client?.waitForUpdateChannelTransaction,
            ZionClientEvent.UpdatedChannel,
        ),
        createRoleTransaction: useWithCatch(client?.createRoleTransaction),
        waitForCreateRoleTransaction: useWithCatch(client?.waitForCreateRoleTransaction),
        waitForAddRoleToChannelTransaction: useWithCatch(
            client?.waitForAddRoleToChannelTransaction,
        ),
        addRoleToChannelTransaction: useWithCatch(client?.addRoleToChannelTransaction),
        updateRoleTransaction: useWithCatch(client?.updateRoleTransaction),
        waitForUpdateRoleTransaction: useWithCatch(client?.waitForUpdateRoleTransaction),
        deleteRoleTransaction: useWithCatch(client?.deleteRoleTransaction),
        waitForDeleteRoleTransaction: useWithCatch(client?.waitForDeleteRoleTransaction),
        editMessage: useWithCatch(client?.editMessage),
        getIsWalletIdRegistered,
        getServerVersions: useWithCatch(client?.getServerVersions),
        inviteUser: useWithCatch(client?.inviteUser),
        isRoomEncrypted,
        joinRoom: useWithCatch(client?.joinRoom),
        leaveRoom: useWithCatch(client?.leave),
        loginWithWallet,
        logout,
        redactEvent: useWithCatch(client?.redactEvent),
        registerWallet,
        resetFullyReadMarkers,
        scrollback: useWithCatch(client?.scrollback),
        sendMessage: useWithCatch(client?.sendMessage),
        sendReaction: useWithCatch(client?.sendReaction),
        sendReadReceipt: useWithCatch(sendReadReceipt),
        setPowerLevel: useWithCatch(client?.setPowerLevel),
        syncSpace: useWithCatch(client?.syncSpace),
        setDisplayName: useWithCatch(client?.setDisplayName),
        setAvatarUrl: useWithCatch(client?.setAvatarUrl),
    }
}

// Map all objects with a name property to an MatrixError
export function isMatrixError(err: unknown): err is MatrixError {
    return (err as Error).name !== undefined && typeof (err as Error).name === 'string'
}

// Used to satisfy RETRY_BACKOFF_RATELIMIT, which doesn't actually look at it
const dummyMatrixEvent = new MatrixEvent()

const useWithCatch = <T extends Array<unknown>, U>(
    fn?: (...args: T) => Promise<U | undefined>,
    event: ZionClientEvent | undefined = undefined,
): ((...args: T) => Promise<U | undefined>) => {
    const { triggerZionClientEvent } = useMatrixStore()
    const client = useZionContext().client
    return useMemo(
        () =>
            async (...args: T): Promise<U | undefined> => {
                if (fn && client) {
                    let retryCount = 0
                    // Loop until success, or MatrixScheduler.RETRY_BACKOFF_RATELIMIT returns -1
                    // MatrixScheduler.RETRY_BACKOFF_RATELIMIT returns -1 when retryCount > 4
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        try {
                            const value = await fn.apply(client, args)
                            if (event) {
                                triggerZionClientEvent(event)
                            }
                            if (retryCount > 0) {
                                console.log(`useWithCatch succeeded after ${retryCount} retries`)
                            }
                            return value
                        } catch (err) {
                            if (isMatrixError(err)) {
                                const retryDelay = MatrixScheduler.RETRY_BACKOFF_RATELIMIT(
                                    dummyMatrixEvent,
                                    retryCount,
                                    err,
                                )
                                if (retryDelay >= 0) {
                                    console.log(`MatrixError`, { retryDelay, err })
                                    await new Promise((resolve) => setTimeout(resolve, retryDelay))
                                    retryCount++
                                    continue
                                }
                                console.log(
                                    `MatrixError reached limit, giving up`,
                                    retryCount,
                                    retryDelay,
                                    err,
                                )
                            } else {
                                // Not a MatrixError, just give up
                                console.error('Not a MatrixError', err)
                            }
                            return
                        }
                    }
                } else {
                    console.log('useZionClient: Not logged in')
                }
            },
        [fn, client, event, triggerZionClientEvent],
    )
}
