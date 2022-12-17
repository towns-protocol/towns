import React, { useEffect } from 'react'
import { LoginStatus } from '../../../src/hooks/login'
import { RoomIdentifier } from '../../../src/types/room-identifier'
import { ZionAuth } from '../../../src/client/ZionClientTypes'
import { getUsernameFromId } from '../../../src/types/user-identifier'
import { useCredentialStore } from '../../../src/store/use-credential-store'
import { useMatrixStore } from '../../../src/store/use-matrix-store'
import { useMatrixCredentials } from '../../../src/hooks/use-matrix-credentials'
import { useMyMembership } from '../../../src/hooks/use-my-membership'
import { useZionClient } from '../../../src/hooks/use-zion-client'
import { useWeb3Context } from '../../../src/components/Web3ContextProvider'
import { WalletStatus } from '../../../src/types/web3-types'
import { useZionContext } from '../../../src/components/ZionContextProvider'

export const RegisterWallet = () => {
    const { walletStatus } = useWeb3Context()
    const { loginStatus, loginError, userId } = useMatrixCredentials()
    const { clientRunning, registerWallet } = useZionClient()

    useEffect(() => {
        if (walletStatus === WalletStatus.Connected) {
            void (async () => {
                await registerWallet('login...')
            })()
        }
    }, [registerWallet, walletStatus])
    return (
        <>
            <div data-testid="userId">{userId}</div>
            <div data-testid="walletStatus">{walletStatus}</div>
            <div data-testid="loginStatus">{loginStatus}</div>
            <div data-testid="loginError">{loginError?.message ?? ''}</div>
            <div data-testid="clientRunning">{clientRunning ? 'true' : 'false'}</div>
        </>
    )
}

export const LoginWithWallet = () => {
    const { walletStatus } = useWeb3Context()
    const { loginStatus, loginError } = useMatrixStore()
    const { clientRunning, loginWithWallet } = useZionClient()
    useEffect(() => {
        if (walletStatus === WalletStatus.Connected) {
            void (async () => {
                await loginWithWallet('login...')
            })()
        }
    }, [loginWithWallet, walletStatus])
    return (
        <>
            <div data-testid="walletStatus">{walletStatus}</div>
            <div data-testid="loginStatus">{loginStatus}</div>
            <div data-testid="loginError">{loginError?.message ?? ''}</div>
            <div data-testid="clientRunning">{clientRunning ? 'true' : 'false'}</div>
        </>
    )
}

interface LoginWithAuthProps {
    auth: ZionAuth
}

export const LoginWithAuth = (props: LoginWithAuthProps) => {
    const { homeServerUrl } = useZionContext()
    const { walletStatus } = useWeb3Context()
    const { loginStatus, loginError, setLoginStatus } = useMatrixStore()
    const { clientRunning } = useZionClient()
    const { setMatrixCredentials } = useCredentialStore()
    useEffect(() => {
        if (walletStatus === WalletStatus.Connected) {
            setMatrixCredentials(homeServerUrl, {
                accessToken: props.auth.accessToken,
                deviceId: props.auth.deviceId,
                userId: props.auth.userId,
                username: getUsernameFromId(props.auth.userId),
            })
            setLoginStatus(LoginStatus.LoggedIn)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletStatus])
    return (
        <>
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
    useEffect(() => {
        if (clientRunning) {
            void (async () => {
                await joinRoom(spaceId)
                await joinRoom(channelId)
            })()
        }
    }, [channelId, clientRunning, joinRoom, spaceId])
    return (
        <>
            <RegisterWallet />
            <div data-testid="spaceMembership"> {mySpaceMembership} </div>
            <div data-testid="channelMembership"> {myChannelMembership} </div>
        </>
    )
}

export const RegisterAndJoin = (props: { roomIds: RoomIdentifier[] }) => {
    const { roomIds } = props
    const { clientRunning, joinRoom } = useZionClient()
    const [joinComplete, setJoinComplete] = React.useState(false)
    useEffect(() => {
        if (clientRunning) {
            void (async () => {
                for (const roomId of roomIds) {
                    await joinRoom(roomId)
                }
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
