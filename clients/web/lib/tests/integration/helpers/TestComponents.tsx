import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Address } from 'wagmi'
import { LoginStatus } from '../../../src/hooks/login'
import { RoomIdentifier } from '../../../src/types/room-identifier'
import { MatrixAuth, SpaceProtocol } from '../../../src/client/ZionClientTypes'
import { getUsernameFromId } from '../../../src/types/user-identifier'
import { useCredentialStore } from '../../../src/store/use-credential-store'
import { useMatrixStore } from '../../../src/store/use-matrix-store'
import { useMatrixCredentials } from '../../../src/hooks/use-matrix-credentials'
import { useCasablancaCredentials } from '../../../src/hooks/use-casablanca-credentials'
import { useMyMembership } from '../../../src/hooks/use-my-membership'
import { useZionClient } from '../../../src/hooks/use-zion-client'
import { useWeb3Context } from '../../../src/components/Web3ContextProvider'
import { WalletStatus } from '../../../src/types/web3-types'
import { useZionContext } from '../../../src/components/ZionContextProvider'
import { useCreateSpaceTransaction } from '../../../src/hooks/use-create-space-transaction'
import { useCreateChannelTransaction } from '../../../src/hooks/use-create-channel-transaction'
import { useAddRoleToChannelTransaction } from '../../../src/hooks/use-add-role-channel-transaction'
import { useUpdateChannelTransaction } from '../../../src/hooks/use-update-channel-transaction'
import { useCreateRoleTransaction } from '../../../src/hooks/use-create-role-transaction'
import { useDeleteRoleTransaction } from '../../../src/hooks/use-delete-role-transaction'
import { useUpdateRoleTransaction } from '../../../src/hooks/use-update-role-transaction'
import { getPrimaryProtocol } from './TestUtils'
import { staticAssertNever } from '../../../src/utils/zion-utils'

export const RegisterWallet = () => {
    const { walletStatus, isConnected } = useWeb3Context()
    const matrixCredentials = useMatrixCredentials()
    const riverCridentials = useCasablancaCredentials()
    const loginStatus =
        getPrimaryProtocol() === SpaceProtocol.Matrix
            ? matrixCredentials.loginStatus
            : riverCridentials.loginStatus
    const loginError =
        getPrimaryProtocol() === SpaceProtocol.Matrix
            ? matrixCredentials.loginError
            : riverCridentials.loginError
    const userId =
        getPrimaryProtocol() === SpaceProtocol.Matrix
            ? matrixCredentials.userId
            : riverCridentials.userId

    const { clientRunning, registerWalletWithMatrix, registerWalletWithCasablanca } =
        useZionClient()
    const registeringWallet = useRef(false)
    const [registeredWallet, setRegisteredWallet] = useState(false)

    useEffect(() => {
        if (walletStatus === WalletStatus.Connected && !registeringWallet.current) {
            registeringWallet.current = true
            void (async () => {
                const protocol = getPrimaryProtocol()
                if (protocol === SpaceProtocol.Matrix) {
                    await registerWalletWithMatrix('login...')
                } else if (protocol === SpaceProtocol.Casablanca) {
                    await registerWalletWithCasablanca('login...')
                } else {
                    staticAssertNever(protocol)
                }
                setRegisteredWallet(true)
            })()
        }
    }, [registerWalletWithCasablanca, registerWalletWithMatrix, walletStatus])
    return (
        <>
            <div data-testid="primaryProtocol">{getPrimaryProtocol()}</div>
            <div data-testid="isConnected">{isConnected.toString()}</div>
            <div data-testid="registeredWallet">{String(registeredWallet)}</div>
            <div data-testid="userId">{userId}</div>
            <div data-testid="walletStatus">{walletStatus}</div>
            <div data-testid="loginStatus">{loginStatus}</div>
            <div data-testid="loginError">{loginError?.message ?? ''}</div>
            <div data-testid="clientRunning">{clientRunning ? 'true' : 'false'}</div>
        </>
    )
}

export const LoginWithWallet = () => {
    const { walletStatus, isConnected } = useWeb3Context()
    const matrixCredentials = useMatrixCredentials()
    const riverCridentials = useCasablancaCredentials()
    const loginStatus =
        getPrimaryProtocol() === SpaceProtocol.Matrix
            ? matrixCredentials.loginStatus
            : riverCridentials.loginStatus
    const loginError =
        getPrimaryProtocol() === SpaceProtocol.Matrix
            ? matrixCredentials.loginError
            : riverCridentials.loginError
    const { clientRunning, loginWithWalletToMatrix, loginWithWalletToCasablanca } = useZionClient()
    const logingInWithWallet = useRef(false)

    useEffect(() => {
        if (walletStatus === WalletStatus.Connected && !logingInWithWallet.current) {
            logingInWithWallet.current = true
            void (async () => {
                const protocol = getPrimaryProtocol()
                if (protocol === SpaceProtocol.Matrix) {
                    await loginWithWalletToMatrix('login...')
                } else if (protocol === SpaceProtocol.Casablanca) {
                    await loginWithWalletToCasablanca('login...')
                } else {
                    staticAssertNever(protocol)
                }
                logingInWithWallet.current = false
            })()
        }
    }, [loginWithWalletToCasablanca, loginWithWalletToMatrix, walletStatus])
    return (
        <>
            <div data-testid="primaryProtocol">{getPrimaryProtocol()}</div>
            <div data-testid="isConnected">{isConnected.toString()}</div>
            <div data-testid="walletStatus">{walletStatus}</div>
            <div data-testid="loginStatus">{loginStatus}</div>
            <div data-testid="loginError">{loginError?.message ?? ''}</div>
            <div data-testid="clientRunning">{clientRunning ? 'true' : 'false'}</div>
        </>
    )
}

interface LoginWithAuthProps {
    auth: MatrixAuth
    walletAddress: string
}

export const LoginWithAuth = (props: LoginWithAuthProps) => {
    const { homeServerUrl } = useZionContext()
    const { walletStatus, isConnected } = useWeb3Context()
    const { loginStatus, loginError, setLoginStatus } = useMatrixStore()
    const { clientRunning } = useZionClient()
    const { setMatrixCredentials } = useCredentialStore()
    useEffect(() => {
        if (walletStatus === WalletStatus.Connected) {
            const protocol = getPrimaryProtocol()
            if (protocol === SpaceProtocol.Matrix) {
                setMatrixCredentials(homeServerUrl, {
                    accessToken: props.auth.accessToken,
                    deviceId: props.auth.deviceId,
                    userId: props.auth.userId,
                    username: getUsernameFromId(props.auth.userId),
                    loggedInWalletAddress: props.walletAddress as Address,
                })
                setLoginStatus(LoginStatus.LoggedIn)
            } else if (protocol === SpaceProtocol.Casablanca) {
                throw new Error('Not implemented')
            } else {
                staticAssertNever(protocol)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletStatus])
    return (
        <>
            <div data-testid="primaryProtocol">{getPrimaryProtocol()}</div>
            <div data-testid="isConnected">{isConnected.toString()}</div>
            <div data-testid="walletStatus">{walletStatus}</div>
            <div data-testid="loginStatus">{loginStatus}</div>
            <div data-testid="loginError">{loginError?.message ?? ''}</div>
            <div data-testid="clientRunning">{clientRunning ? 'true' : 'false'}</div>
        </>
    )
}

interface RegisterAndJoinSpaceProps {
    spaceId: RoomIdentifier
    channelId: RoomIdentifier
}

export const RegisterAndJoinSpace = (props: RegisterAndJoinSpaceProps) => {
    const { spaceId, channelId } = props
    const { clientRunning, joinRoom } = useZionClient()
    const mySpaceMembership = useMyMembership(spaceId)
    const myChannelMembership = useMyMembership(channelId)
    const [joinComplete, setJoinComplete] = React.useState(false)
    const joiningRooms = useRef(false)
    useEffect(() => {
        if (clientRunning && !joiningRooms.current) {
            joiningRooms.current = true
            void (async () => {
                await joinRoom(spaceId)
                await joinRoom(channelId)
                setJoinComplete(true)
                joiningRooms.current = false
            })()
        }
    }, [channelId, clientRunning, joinRoom, spaceId])
    return (
        <>
            <RegisterWallet />
            <div data-testid="spaceMembership"> {mySpaceMembership} </div>
            <div data-testid="channelMembership"> {myChannelMembership} </div>
            <div data-testid="joinComplete">{joinComplete ? 'true' : 'false'}</div>
        </>
    )
}

export const RegisterAndJoin = (props: { roomIds: RoomIdentifier[] }) => {
    const { roomIds } = props
    const joinedRoomIds = useRef<string[]>([])
    const { clientRunning, joinRoom } = useZionClient()
    const [joinComplete, setJoinComplete] = React.useState(false)

    useEffect(() => {
        if (clientRunning) {
            const toJoin = roomIds.filter(
                (roomId) => !joinedRoomIds.current.includes(roomId.networkId),
            )
            joinedRoomIds.current = joinedRoomIds.current.concat(
                toJoin.map((roomId) => roomId.networkId),
            )
            void (async () => {
                await Promise.all(toJoin.map(async (roomId) => joinRoom(roomId)))
                setJoinComplete(true)
            })()
        }
    }, [clientRunning, joinRoom, roomIds])
    return (
        <>
            <RegisterWallet />
            <div data-testid="joinComplete">{joinComplete ? 'true' : 'false'}</div>
        </>
    )
}

export function TransactionInfo<
    T extends
        | ReturnType<typeof useCreateSpaceTransaction>
        | ReturnType<typeof useCreateChannelTransaction>
        | ReturnType<typeof useUpdateChannelTransaction>
        | ReturnType<typeof useAddRoleToChannelTransaction>
        | ReturnType<typeof useCreateRoleTransaction>
        | ReturnType<typeof useUpdateRoleTransaction>
        | ReturnType<typeof useDeleteRoleTransaction>,
>(props: {
    for: T

    label: string
}) {
    const { for: transaction, label } = props

    const renderData = useCallback(() => {
        if (!transaction.data) {
            return 'undefined'
        }
        return JSON.stringify(transaction.data)
    }, [transaction.data])

    const renderError = useCallback(() => {
        if (!transaction.error) {
            return 'undefined'
        }
        return JSON.stringify(transaction.error)
    }, [transaction.error])

    return (
        <div data-testid={label}>
            <div>isLoading: {transaction.isLoading.toString()}</div>
            <div>data: {renderData()}</div>
            <div>error: {renderError()}</div>
            <div>transactionHash: {transaction.transactionHash ?? 'undefined'}</div>
            <div>transactionStatus: {transaction.transactionStatus ?? 'undefined'}</div>
        </div>
    )
}
