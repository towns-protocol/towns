/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/unbound-method */
import { useMemo } from 'react'
import { FullyReadMarker } from '@river/proto'
import {
    ChannelTransactionContext,
    ChannelUpdateTransactionContext,
    CreateSpaceTransactionContext,
    IZionServerVersions,
    RoleTransactionContext,
    TransactionContext,
    WalletLinkTransactionContext,
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
import { RoomMessageEvent } from '../types/timeline-types'
import { ZionClient } from '../client/ZionClient'
import { useLogout } from '../hooks/use-logout'
import { useMatrixWalletSignIn } from './use-matrix-wallet-sign-in'
import { useResetFullyReadMarkers } from './ZionContext/useResetFullyReadMarkers'
import { useSendReadReceipt } from './ZionContext/useSendReadReceipt'
import { useZionContext } from '../components/ZionContextProvider'
import { useCasablancaWalletSignIn } from './use-casablanca-wallet-signin'
import { create } from 'zustand'
import { ITownArchitectBase, TokenEntitlementDataTypes, Permission } from '@river/web3'
import { isTestEnv } from '@river/sdk'
import { TSigner } from 'types/web3-types'

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
    spaceDapp: ZionClient['spaceDapp'] | undefined
    createSpaceTransaction: (
        createSpaceInfo: CreateSpaceInfo,
        membership: ITownArchitectBase.MembershipStruct,
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
    createMediaStream: (channelId: string, chunkCount: number) => Promise<string | undefined>
    createRoleTransaction: (
        spaceNetworkId: string,
        roleName: string,
        permissions: Permission[],
        tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
        users: string[],
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
        tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
        users: string[],
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
    getServerVersions: () => Promise<IZionServerVersions | undefined>
    inviteUser: (roomId: string, userId: string) => Promise<void>
    joinRoom: (roomId: string, parentNetworkId?: string) => Promise<Room | undefined>
    leaveRoom: (roomId: string, parentNetworkId?: string) => Promise<void>
    logout: () => Promise<void>
    loginWithWalletToCasablanca: (statement: string, signer: TSigner) => Promise<void>
    joinTown: (spaceId: string, signer: TSigner) => Promise<Room | undefined>
    redactEvent: (roomId: string, eventId: string, reason?: string) => Promise<void>
    registerWalletWithCasablanca: (statement: string, signer: TSigner) => Promise<void>
    removeUser: (streamId: string, userId: string) => Promise<void>
    resetFullyReadMarkers: () => void
    scrollback: (
        roomId: string,
        limit?: number,
    ) => Promise<
        | {
              terminus: boolean
              eventCount: number
              firstEventId?: string
              firstEventTimestamp?: number
          }
        | undefined
    >
    sendMessage: (roomId: string, message: string, options?: SendMessageOptions) => Promise<void>
    sendReaction: (roomId: string, eventId: string, reaction: string) => Promise<void>
    sendMediaPayload: (streamId: string, data: Uint8Array, chunkIndex: number) => Promise<void>
    sendReadReceipt: (marker: FullyReadMarker) => Promise<void>
    setAvatarUrl: (ravatarUrl: string) => Promise<void>
    setRoomProperties: (roomId: string, title: string, topic: string) => Promise<void>
    setDisplayName: (streamId: string, displayName: string) => Promise<void>
    setPriorityStreamIds: (streamIds: string[]) => Promise<void>
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
    userOnWrongNetworkForSignIn: boolean
}

export function useZionClient(): ZionClientImpl {
    const { userOnWrongNetworkForSignIn } = useMatrixWalletSignIn()
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
        sendMessage: useWithCatch(client?.sendMessage),
        sendReaction: useWithCatch(client?.sendReaction),
        sendMediaPayload: useWithCatch(client?.sendMediaPayload),
        sendReadReceipt: useWithCatch(sendReadReceipt),
        setDisplayName: useWithCatch(client?.setDisplayName),
        setPriorityStreamIds: useWithCatch(client?.setPriorityStreamIds),
        setRoomProperties: useWithCatch(client?.setRoomProperties),
        setAvatarUrl: useWithCatch(client?.setAvatarUrl),
        linkWallet: useWithCatch(client?.linkWallet),
        removeLink: useWithCatch(client?.removeLink),
        getLinkedWallets: useWithCatch(client?.getLinkedWallets),
        waitWalletLinkTransaction: useWithCatch(client?.waitWalletLinkTransaction),
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
): ((...args: T) => Promise<U | undefined>) => {
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
        [fn, client, appendError],
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
