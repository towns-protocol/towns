import {
    CreateChannelInfo,
    CreateSpaceInfo,
    EditMessageOptions,
    PowerLevel,
    Room,
    RoomIdentifier,
    SendMessageOptions,
    SendTextMessageOptions,
} from '../types/matrix-types'

/* eslint-disable @typescript-eslint/unbound-method */
import { IZionServerVersions, ZionClientEvent } from '../client/ZionClientTypes'
import { useLoginWithPassword } from './MatrixClient/useLoginWithPassword'
import { useLogout } from './MatrixClient/useLogout'
import { useMatrixStore } from '../store/use-matrix-store'
import { useMatrixWalletSignIn } from './use-matrix-wallet-sign-in'
import { useMemo } from 'react'
import { useRegisterPasswordUser } from './MatrixClient/useRegisterPasswordUser'
import { useZionContext } from '../components/ZionContextProvider'
import { MatrixSpaceHierarchy } from '../client/matrix/SyncSpace'
import { CouncilNFTShim } from 'client/web3/shims/CouncilNFTShim'
import { DataTypes, ZionSpaceManagerShim } from 'client/web3/shims/ZionSpaceManagerShim'
import { FullyReadMarker } from 'types/timeline-types'
import { useSendReadReceipt } from './ZionContext/useSendReadReceipt'
import { useResetFullyReadMarkers } from './ZionContext/useResetFullyReadMarkers'

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
    createWeb3Space: (
        createInfo: CreateSpaceInfo,
        tokenEntitlement: DataTypes.CreateSpaceEntitlementDataStruct,
        everyonePermissions: DataTypes.PermissionStruct[],
    ) => Promise<RoomIdentifier | undefined>
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
    loginWithPassword: (username: string, password: string) => Promise<void>
    loginWithWallet: (statement: string) => Promise<void>
    redactEvent: (roomId: RoomIdentifier, eventId: string, reason?: string) => Promise<void>
    registerPasswordUser: (username: string, password: string) => Promise<void>
    registerWallet: (statement: string) => Promise<void>
    resetFullyReadMarkers: () => void
    scrollback: (roomId: RoomIdentifier, limit?: number) => Promise<void>
    sendMessage: (
        roomId: RoomIdentifier,
        message: string,
        options?: SendMessageOptions,
    ) => Promise<void>
    sendNotice: (roomId: RoomIdentifier, message: string) => Promise<void>
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
    const loginWithPassword = useLoginWithPassword()
    const logout = useLogout()
    const registerPasswordUser = useRegisterPasswordUser()
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
        createWeb3Space: useWithCatch(client?.createWeb3Space, ZionClientEvent.NewSpace),
        createWeb3Channel: useWithCatch(client?.createWeb3Channel),
        editMessage: useWithCatch(client?.editMessage),
        getIsWalletIdRegistered,
        getServerVersions: useWithCatch(client?.getServerVersions),
        inviteUser: useWithCatch(client?.inviteUser),
        joinRoom: useWithCatch(client?.joinRoom),
        leaveRoom: useWithCatch(client?.leave),
        loginWithPassword,
        loginWithWallet,
        logout,
        redactEvent: useWithCatch(client?.redactEvent),
        registerPasswordUser,
        registerWallet,
        resetFullyReadMarkers,
        scrollback: useWithCatch(client?.scrollback),
        sendMessage: useWithCatch(client?.sendMessage),
        sendReaction: useWithCatch(client?.sendReaction),
        sendNotice: useWithCatch(client?.sendNotice),
        sendReadReceipt,
        setPowerLevel: useWithCatch(client?.setPowerLevel),
        syncSpace: useWithCatch(client?.syncSpace),
        setDisplayName: useWithCatch(client?.setDisplayName),
        setAvatarUrl: useWithCatch(client?.setAvatarUrl),
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useWithCatch = <T extends Array<any>, U>(
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (ex: any) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        console.error('Error', ex.stack, ex)
                        return Promise.resolve(undefined)
                    }
                } else {
                    console.log('useZionClient: Not logged in')
                    return Promise.resolve(undefined)
                }
            },
        [fn, client, event, triggerZionClientEvent],
    )
}
