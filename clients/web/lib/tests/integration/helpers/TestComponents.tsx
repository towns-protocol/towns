import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RoomIdentifier } from '../../../src/types/room-identifier'
import { useCasablancaCredentials } from '../../../src/hooks/use-casablanca-credentials'
import { useMyMembership } from '../../../src/hooks/use-my-membership'
import { useZionClient } from '../../../src/hooks/use-zion-client'
import { useWalletStatus, useWeb3Context } from '../../../src/components/Web3ContextProvider'
import { WalletStatus } from '../../../src/types/web3-types'
import { useCreateSpaceTransaction } from '../../../src/hooks/use-create-space-transaction'
import { useCreateChannelTransaction } from '../../../src/hooks/use-create-channel-transaction'
import { useAddRoleToChannelTransaction } from '../../../src/hooks/use-add-role-channel-transaction'
import { useUpdateChannelTransaction } from '../../../src/hooks/use-update-channel-transaction'
import { useCreateRoleTransaction } from '../../../src/hooks/use-create-role-transaction'
import { useDeleteRoleTransaction } from '../../../src/hooks/use-delete-role-transaction'
import { useUpdateRoleTransaction } from '../../../src/hooks/use-update-role-transaction'
import { useUpdateSpaceNameTransaction } from '../../../src/hooks/use-update-space-name-transaction'

export const RegisterWallet = () => {
    const { isConnected } = useWeb3Context()
    const walletStatus = useWalletStatus()
    const riverCridentials = useCasablancaCredentials()
    const loginStatus = riverCridentials.loginStatus
    const loginError = riverCridentials.loginError
    const userId = riverCridentials.userId

    const { clientRunning, registerWalletWithCasablanca } = useZionClient()
    const registeringWallet = useRef(false)
    const [registeredWallet, setRegisteredWallet] = useState(false)

    useEffect(() => {
        if (walletStatus === WalletStatus.Connected && !registeringWallet.current) {
            registeringWallet.current = true
            void (async () => {
                await registerWalletWithCasablanca('login...')
                setRegisteredWallet(true)
            })()
        }
    }, [registerWalletWithCasablanca, walletStatus])
    return (
        <>
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
    const { isConnected } = useWeb3Context()
    const walletStatus = useWalletStatus()
    const riverCridentials = useCasablancaCredentials()
    const loginStatus = riverCridentials.loginStatus
    const loginError = riverCridentials.loginError
    const { clientRunning, loginWithWalletToCasablanca } = useZionClient()
    const logingInWithWallet = useRef(false)

    useEffect(() => {
        if (walletStatus === WalletStatus.Connected && !logingInWithWallet.current) {
            logingInWithWallet.current = true
            void (async () => {
                await loginWithWalletToCasablanca('login...')
                logingInWithWallet.current = false
            })()
        }
    }, [loginWithWalletToCasablanca, walletStatus])
    return (
        <>
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
    const { clientRunning, joinRoom, joinTown } = useZionClient()
    const { signer } = useWeb3Context()
    const mySpaceMembership = useMyMembership(spaceId)
    const myChannelMembership = useMyMembership(channelId)
    const [joinComplete, setJoinComplete] = React.useState(false)
    const joiningRooms = useRef(false)
    useEffect(() => {
        if (clientRunning && !joiningRooms.current && signer) {
            joiningRooms.current = true
            void (async () => {
                await joinTown(spaceId, signer)
                await joinRoom(channelId)
                setJoinComplete(true)
                joiningRooms.current = false
            })()
        }
    }, [channelId, clientRunning, joinRoom, joinTown, signer, spaceId])
    return (
        <>
            <RegisterWallet />
            <div data-testid="spaceMembership"> {mySpaceMembership} </div>
            <div data-testid="channelMembership"> {myChannelMembership} </div>
            <div data-testid="joinComplete">{joinComplete ? 'true' : 'false'}</div>
        </>
    )
}

export const RegisterAndJoin = (props: {
    spaceId: RoomIdentifier
    channelIds: RoomIdentifier[]
}) => {
    const { spaceId, channelIds } = props
    const didExecute = useRef(false)
    const { clientRunning, joinTown, joinRoom } = useZionClient()
    const [joinStatus, setJoinStatus] = useState<Record<string, boolean>>({})
    const [joinComplete, setJoinComplete] = React.useState(false)
    const { signer } = useWeb3Context()

    useEffect(() => {
        if (clientRunning && !didExecute.current && signer) {
            setJoinStatus((prev) => ({ ...prev, ['executing']: true }))
            didExecute.current = true
            void (async () => {
                await joinTown(spaceId, signer)
                setJoinStatus((prev) => ({ ...prev, [spaceId.networkId]: true }))
                for (const roomId of channelIds) {
                    await joinRoom(roomId)
                    setJoinStatus((prev) => ({ ...prev, [roomId.networkId]: true }))
                }

                setJoinComplete(true)
            })()
        }
    }, [clientRunning, joinTown, channelIds, spaceId, joinRoom, signer])
    return (
        <>
            <RegisterWallet />
            <div data-testid="joinStatus">{JSON.stringify(joinStatus)}</div>
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
        | ReturnType<typeof useDeleteRoleTransaction>
        | ReturnType<typeof useUpdateSpaceNameTransaction>,
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
