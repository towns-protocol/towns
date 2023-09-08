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
    Room,
    SendMessageOptions,
    SendTextMessageOptions,
    UpdateChannelInfo,
} from '../types/zion-types'
import { MatrixError, MatrixEvent, MatrixScheduler } from 'matrix-js-sdk'
import { useCallback, useMemo } from 'react'

import { FullyReadMarker, RoomMessageEvent } from '../types/timeline-types'
import { ISpaceDapp } from 'client/web3/ISpaceDapp'
import { MatrixSpaceHierarchy } from '../client/matrix/SyncSpace'
import { Permission } from '../client/web3/ContractTypes'
import { RoomIdentifier } from '../types/room-identifier'
import { ITownArchitectBase } from '../client/web3/v3/ITownArchitectShim'
import { TokenEntitlementDataTypes } from '../client/web3/v3/TokenEntitlementShim'
import { ZionClient } from '../client/ZionClient'
import { useLogout } from './MatrixClient/useLogout'
import { useMatrixStore } from '../store/use-matrix-store'
import { useMatrixWalletSignIn } from './use-matrix-wallet-sign-in'
import { useResetFullyReadMarkers } from './ZionContext/useResetFullyReadMarkers'
import { useSendReadReceipt } from './ZionContext/useSendReadReceipt'
import { useZionContext } from '../components/ZionContextProvider'
import { useCasablancaWalletSignIn } from './use-casablanca-wallet-signin'
import { isTestEnv } from '../utils/zion-utils'
import { ethers } from 'ethers'
import { create } from 'zustand'

export type ZionErrorStoreState = {
    errors: string[]
    appendError: (error: string) => void
}

export const useZionErrorStore = create<ZionErrorStoreState>((set) => ({
    errors: [],
    appendError: (error: string) =>
        set((state) => ({
            errors: [...state.errors, error],
        })),
}))

/**
 * Matrix client API to interact with the Matrix server.
 */
interface ZionClientImpl {
    chainId: number | undefined
    client: ZionClient | undefined
    clientRunning: boolean
    spaceDapp: ISpaceDapp | undefined
    createSpaceTransaction: (
        createSpaceInfo: CreateSpaceInfo,
        memberEntitlements: ITownArchitectBase.MemberEntitlementStruct,
        everyonePermissions: Permission[],
        signer: ethers.Signer | undefined,
    ) => Promise<TransactionContext<RoomIdentifier> | undefined>
    waitForCreateSpaceTransaction: (
        context: TransactionContext<RoomIdentifier> | undefined,
    ) => Promise<TransactionContext<RoomIdentifier> | undefined>
    createChannelRoom: (
        createInfo: CreateChannelInfo,
        networkId: string,
    ) => Promise<RoomIdentifier | undefined>
    createChannel: (
        createInfo: CreateChannelInfo,
        signer: ethers.Signer | undefined,
    ) => Promise<RoomIdentifier | undefined>
    createChannelTransaction: (
        createChannelInfo: CreateChannelInfo,
        signer: ethers.Signer | undefined,
    ) => Promise<ChannelTransactionContext | undefined>
    waitForCreateChannelTransaction: (
        context: ChannelTransactionContext | undefined,
    ) => Promise<ChannelTransactionContext | undefined>
    updateChannelTransaction: (
        updateChannelInfo: UpdateChannelInfo,
        signer: ethers.Signer | undefined,
    ) => Promise<ChannelUpdateTransactionContext | undefined>
    waitForUpdateChannelTransaction: (
        context: ChannelUpdateTransactionContext | undefined,
    ) => Promise<ChannelUpdateTransactionContext | undefined>
    createRoleTransaction: (
        spaceNetworkId: string,
        roleName: string,
        permissions: Permission[],
        tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
        users: string[],
        signer: ethers.Signer | undefined,
    ) => Promise<RoleTransactionContext | undefined>
    addRoleToChannelTransaction: (
        spaceNetworkId: string,
        channelNetworkId: string,
        roleId: number,
        signer: ethers.Signer | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForAddRoleToChannelTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForCreateRoleTransaction: (
        context: RoleTransactionContext | undefined,
    ) => Promise<RoleTransactionContext | undefined>
    updateRoleTransaction: (
        spaceNetworkId: string,
        roleId: number,
        roleName: string,
        permissions: Permission[],
        tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
        users: string[],
        signer: ethers.Signer | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForUpdateRoleTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    deleteRoleTransaction: (
        spaceNetworkId: string,
        roleId: number,
        signer: ethers.Signer | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    waitForDeleteRoleTransaction: (
        context: TransactionContext<void> | undefined,
    ) => Promise<TransactionContext<void> | undefined>
    editMessage: (
        roomId: RoomIdentifier,
        eventId: string,
        originalEventContent: RoomMessageEvent,
        message: string,
        options: SendTextMessageOptions | undefined,
    ) => Promise<void>
    getIsWalletRegisteredWithMatrix: () => Promise<boolean>
    getIsWalletRegisteredWithCasablanca: () => Promise<boolean>
    getServerVersions: () => Promise<IZionServerVersions | undefined>
    inviteUser: (roomId: RoomIdentifier, userId: string) => Promise<void>
    isRoomEncrypted: (roomId: RoomIdentifier) => boolean | undefined
    joinRoom: (roomId: RoomIdentifier, parentNetworkId?: string) => Promise<Room | undefined>
    leaveRoom: (roomId: RoomIdentifier, parentNetworkId?: string) => Promise<void>
    logout: () => Promise<void>
    loginWithWalletToMatrix: (statement: string) => Promise<void>
    loginWithWalletToCasablanca: (statement: string) => Promise<void>
    redactEvent: (roomId: RoomIdentifier, eventId: string, reason?: string) => Promise<void>
    registerWalletWithMatrix: (statement: string) => Promise<void>
    registerWalletWithCasablanca: (statement: string) => Promise<void>
    resetFullyReadMarkers: () => void
    scrollback: (roomId: RoomIdentifier, limit?: number) => Promise<void>
    sendMessage: (
        roomId: RoomIdentifier,
        message: string,
        options?: SendMessageOptions,
    ) => Promise<void>
    sendReaction: (roomId: RoomIdentifier, eventId: string, reaction: string) => Promise<void>
    sendReadReceipt: (marker: FullyReadMarker) => Promise<void>
    setAvatarUrl: (ravatarUrl: string) => Promise<void>
    setDisplayName: (displayName: string) => Promise<void>
    setRoomName: (roomId: RoomIdentifier, roomName: string) => Promise<void>
    setRoomTopic: (roomId: RoomIdentifier, roomTopic: string) => Promise<void>
    getRoomTopic: (roomId: RoomIdentifier) => Promise<string | undefined>
    syncSpace: (
        spaceId: RoomIdentifier,
        walletAddress: string,
    ) => Promise<MatrixSpaceHierarchy | undefined>
    userOnWrongNetworkForSignIn: boolean
}

export function useZionClient(): ZionClientImpl {
    const {
        getIsWalletRegisteredWithMatrix,
        loginWithWalletToMatrix,
        registerWalletWithMatrix,
        userOnWrongNetworkForSignIn,
    } = useMatrixWalletSignIn()
    const {
        getIsWalletRegisteredWithCasablanca,
        loginWithWalletToCasablanca,
        registerWalletWithCasablanca,
    } = useCasablancaWalletSignIn()
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
        chainId: client?.opts.chainId,
        client,
        clientRunning,
        spaceDapp: client?.spaceDapp,
        createChannelRoom: useWithCatch(client?.createChannelRoom),
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
        getIsWalletRegisteredWithMatrix,
        getIsWalletRegisteredWithCasablanca,
        getServerVersions: useWithCatch(client?.getServerVersions),
        inviteUser: useWithCatch(client?.inviteUser),
        isRoomEncrypted,
        joinRoom: useWithCatch(client?.joinRoom),
        leaveRoom: useWithCatch(client?.leave),
        loginWithWalletToMatrix,
        loginWithWalletToCasablanca,
        logout,
        redactEvent: useWithCatch(client?.redactEvent),
        registerWalletWithMatrix,
        registerWalletWithCasablanca,
        resetFullyReadMarkers,
        scrollback: useWithCatch(client?.scrollback),
        sendMessage: useWithCatch(client?.sendMessage),
        sendReaction: useWithCatch(client?.sendReaction),
        sendReadReceipt: useWithCatch(sendReadReceipt),
        syncSpace: useWithCatch(client?.syncSpace),
        setDisplayName: useWithCatch(client?.setDisplayName),
        setRoomName: useWithCatch(client?.setRoomName),
        setRoomTopic: useWithCatch(client?.setRoomTopic),
        getRoomTopic: useWithCatch(client?.getRoomTopic),
        setAvatarUrl: useWithCatch(client?.setAvatarUrl),
        userOnWrongNetworkForSignIn,
    }
}

// Map all objects with a name property to an MatrixError
export function isMatrixError(err: unknown): err is MatrixError {
    return (
        (err as Error).name !== undefined &&
        typeof (err as Error).name === 'string' &&
        (err as MatrixError).httpStatus !== undefined
    )
}

// Used to satisfy RETRY_BACKOFF_RATELIMIT, which doesn't actually look at it
const dummyMatrixEvent = new MatrixEvent()

const useWithCatch = <T extends Array<unknown>, U>(
    fn?: (...args: T) => Promise<U | undefined>,
    event: ZionClientEvent | undefined = undefined,
): ((...args: T) => Promise<U | undefined>) => {
    const { triggerZionClientEvent } = useMatrixStore()
    const { appendError } = useZionErrorStore()
    const client = useZionContext().client
    return useMemo(
        () =>
            async (...args: T): Promise<U | undefined> => {
                if (fn && client) {
                    let retryCount = 0
                    // Loop until success, or MatrixScheduler.RETRY_BACKOFF_RATELIMIT returns -1
                    // MatrixScheduler.RETRY_BACKOFF_RATELIMIT returns -1 when retryCount > 4 or httpStatus is 400, 401 or 403
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
                            if (client.opts.verbose === true) {
                                appendError(formatError<T, U>(err, retryCount, fn, args))
                            }
                            if (isMatrixError(err)) {
                                let retryDelay: number
                                // RETRY_BACKOFF_RATELIMIT returns -1 for 401s, so we need to handle that ourselves
                                if (err.httpStatus === 401) {
                                    // retry 401s many times for tests, 36s total (RETRY_BACKOFF_RATELIMIT waits 30s total)
                                    const retryLimit = isTestEnv() ? 12 : 2
                                    retryDelay = retryCount < retryLimit ? 3000 : -1
                                } else {
                                    retryDelay = MatrixScheduler.RETRY_BACKOFF_RATELIMIT(
                                        dummyMatrixEvent,
                                        retryCount,
                                        err,
                                    )
                                }
                                if (retryDelay >= 0) {
                                    console.log(`MatrixError`, { retryDelay, err, retryCount })
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
                                console.error('Not a retryable error', err)
                            }
                            return
                        }
                    }
                } else {
                    console.log('useZionClient: Not logged in')
                }
            },
        [fn, client, event, triggerZionClientEvent, appendError],
    )
}

function formatError<T extends Array<unknown>, U>(
    err: unknown,
    retryCount: number,
    fn: (...args: T) => Promise<U | undefined>,
    args: T,
): string {
    try {
        return `ERROR: ${errorToString(err)} retryCount: ${retryCount} isMatrixError: ${
            isMatrixError(err) ? 'true' : 'false'
        } fn: ${fn.name} args: ${JSON.stringify(args)}`
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        return `unformattable ERROR: ${e}`
    }
}

function errorToString(err: unknown): string {
    try {
        const attempt1 = JSON.stringify(err)
        // combine both the json and the stringified error, so that we see codes and messages
        return `${attempt1} ${String(err)}`
    } catch (e) {
        return `unformattable ERROR: ${String(e)}`
    }
}
