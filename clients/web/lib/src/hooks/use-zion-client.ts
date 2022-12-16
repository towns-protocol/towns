/* eslint-disable @typescript-eslint/unbound-method */

import {
    CreateChannelInfo,
    CreateSpaceInfo,
    EditMessageOptions,
    PowerLevel,
    Room,
    SendMessageOptions,
    SendTextMessageOptions,
} from '../types/matrix-types'
import { DataTypes, ZionSpaceManagerShim } from '../client/web3/shims/ZionSpaceManagerShim'
import { IZionServerVersions, TransactionContext, ZionClientEvent } from '../client/ZionClientTypes'

import { CouncilNFTShim } from '../client/web3/shims/CouncilNFTShim'
import { FullyReadMarker } from '../types/timeline-types'
import { MatrixSpaceHierarchy } from '../client/matrix/SyncSpace'
import { RoomIdentifier } from '../types/room-identifier'
import { useLogout } from './MatrixClient/useLogout'
import { useMatrixStore } from '../store/use-matrix-store'
import { useMatrixWalletSignIn } from './use-matrix-wallet-sign-in'
import { useMemo } from 'react'
import { useResetFullyReadMarkers } from './ZionContext/useResetFullyReadMarkers'
import { useSendReadReceipt } from './ZionContext/useSendReadReceipt'
import { useZionContext } from '../components/ZionContextProvider'

/**
 * Matrix client API to interact with the Matrix server.
 */
interface ZionClientImpl {
    clientRunning: boolean
    councilNFT: CouncilNFTShim | undefined
    spaceManager: ZionSpaceManagerShim | undefined
    chainId: number | undefined
    createSpace: (createInfo: CreateSpaceInfo) => Promise<RoomIdentifier | undefined>
    createBasicWeb3Space: (createInfo: CreateSpaceInfo) => Promise<RoomIdentifier | undefined>
    createSpaceTransaction: (
        createSpaceInfo: CreateSpaceInfo,
        spaceEntitlementData: DataTypes.CreateSpaceEntitlementDataStruct,
        everyonePermissions: DataTypes.PermissionStruct[],
    ) => Promise<TransactionContext<RoomIdentifier> | undefined>
    waitForCreateSpaceTransaction: (
        context: TransactionContext<RoomIdentifier> | undefined,
    ) => Promise<TransactionContext<RoomIdentifier> | undefined>
    createChannel: (createInfo: CreateChannelInfo) => Promise<RoomIdentifier | undefined>
    createWeb3Channel: (createInfo: CreateChannelInfo) => Promise<RoomIdentifier | undefined>
    editMessage: (
        roomId: RoomIdentifier,
        message: string,
        options: EditMessageOptions,
        SendTextMessageOptions: SendTextMessageOptions | undefined,
    ) => Promise<void>
    getIsWalletIdRegistered: () => Promise<boolean>
    getServerVersions: () => Promise<IZionServerVersions | undefined>
    inviteUser: (roomId: RoomIdentifier, userId: string) => Promise<void>
    joinRoom: (roomId: RoomIdentifier) => Promise<Room | undefined>
    leaveRoom: (roomId: RoomIdentifier) => Promise<void>
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

    return {
        clientRunning,
        councilNFT: client?.councilNFT,
        spaceManager: client?.spaceManager,
        chainId: client?.chainId,
        createChannel: useWithCatch(client?.createChannel),
        createSpace: useWithCatch(client?.createSpace),
        createBasicWeb3Space: useWithCatch(client?.createBasicWeb3Space, ZionClientEvent.NewSpace),
        createSpaceTransaction: useWithCatch(client?.createSpaceTransaction),
        waitForCreateSpaceTransaction: useWithCatch(
            client?.waitForCreateSpaceTransaction,
            ZionClientEvent.NewSpace,
        ),
        createWeb3Channel: useWithCatch(client?.createWeb3Channel),
        editMessage: useWithCatch(client?.editMessage),
        getIsWalletIdRegistered,
        getServerVersions: useWithCatch(client?.getServerVersions),
        inviteUser: useWithCatch(client?.inviteUser),
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
        sendReadReceipt,
        setPowerLevel: useWithCatch(client?.setPowerLevel),
        syncSpace: useWithCatch(client?.syncSpace),
        setDisplayName: useWithCatch(client?.setDisplayName),
        setAvatarUrl: useWithCatch(client?.setAvatarUrl),
    }
}

const useWithCatch = <T extends Array<unknown>, U>(
    fn?: (...args: T) => Promise<U | undefined>,
    event: ZionClientEvent | undefined = undefined,
) => {
    const { triggerZionClientEvent } = useMatrixStore()
    const client = useZionContext().client
    return useMemo(
        () =>
            async (...args: T): Promise<U | undefined> => {
                if (fn && client) {
                    try {
                        const value = await fn.apply(client, args)
                        if (event) {
                            triggerZionClientEvent(event)
                        }
                        return value
                    } catch (ex) {
                        console.error('Error', ex)
                    }
                } else {
                    console.log('useZionClient: Not logged in')
                }
            },
        [fn, client, event, triggerZionClientEvent],
    )
}
