import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useCasablancaCredentials } from '../../../src/hooks/use-casablanca-credentials'
import { useMyMembership } from '../../../src/hooks/use-my-membership'
import { useTownsClient } from '../../../src/hooks/use-towns-client'
import { TSigner } from '../../../src/types/web3-types'
import { useCreateSpaceTransactionWithRetries } from '../../../src/hooks/use-create-space-transaction'
import { useCreateChannelTransaction } from '../../../src/hooks/use-create-channel-transaction'
import { useAddRoleToChannelTransaction } from '../../../src/hooks/use-add-role-channel-transaction'
import { useUpdateChannelTransaction } from '../../../src/hooks/use-update-channel-transaction'
import { useCreateRoleTransaction } from '../../../src/hooks/use-create-role-transaction'
import { useDeleteRoleTransaction } from '../../../src/hooks/use-delete-role-transaction'
import { useUpdateRoleTransaction } from '../../../src/hooks/use-update-role-transaction'
import { useUpdateSpaceNameTransaction } from '../../../src/hooks/use-update-space-name-transaction'

export const RegisterWallet = ({ signer }: { signer: TSigner }) => {
    const { userId, authError, authStatus } = useCasablancaCredentials()

    const { clientRunning, registerWalletWithCasablanca } = useTownsClient()
    const registeringWallet = useRef(false)
    const [registeredWallet, setRegisteredWallet] = useState(false)
    const isConnected = Boolean(signer.provider)

    useEffect(() => {
        if (isConnected && !registeringWallet.current) {
            registeringWallet.current = true
            void (async () => {
                await registerWalletWithCasablanca('login...', signer)
                setRegisteredWallet(true)
            })()
        }
    }, [signer, registerWalletWithCasablanca, isConnected])
    return (
        <>
            <div data-testid="isConnected">{isConnected.toString()}</div>
            <div data-testid="registeredWallet">{String(registeredWallet)}</div>
            <div data-testid="userId">{userId}</div>
            <div data-testid="authStatus">{authStatus}</div>
            <div data-testid="authError">{authError?.message ?? ''}</div>
            <div data-testid="clientRunning">{clientRunning ? 'true' : 'false'}</div>
        </>
    )
}

export const LoginWithWallet = ({ signer }: { signer: TSigner }) => {
    const { authStatus, authError } = useCasablancaCredentials()
    const { clientRunning, loginWithWalletToCasablanca } = useTownsClient()
    const logingInWithWallet = useRef(false)
    const isConnected = Boolean(signer.provider)

    useEffect(() => {
        if (isConnected && !logingInWithWallet.current) {
            logingInWithWallet.current = true
            void (async () => {
                await loginWithWalletToCasablanca('login...', signer)
                logingInWithWallet.current = false
            })()
        }
    }, [loginWithWalletToCasablanca, signer, isConnected])
    return (
        <>
            <div data-testid="isConnected">{isConnected.toString()}</div>
            <div data-testid="authStatus">{authStatus}</div>
            <div data-testid="authError">{authError?.message ?? ''}</div>
            <div data-testid="clientRunning">{clientRunning ? 'true' : 'false'}</div>
        </>
    )
}

interface RegisterAndJoinSpaceProps {
    signer: TSigner
    spaceId: string
    channelId: string
}

export const RegisterAndJoinSpace = (props: RegisterAndJoinSpaceProps) => {
    const { spaceId, channelId } = props
    const { clientRunning, joinRoom, joinTown } = useTownsClient()
    const mySpaceMembership = useMyMembership(spaceId)
    const myChannelMembership = useMyMembership(channelId)
    const [joinComplete, setJoinComplete] = React.useState(false)
    const joiningRooms = useRef(false)
    useEffect(() => {
        if (clientRunning && !joiningRooms.current && props.signer) {
            joiningRooms.current = true
            void (async () => {
                await joinTown(spaceId, props.signer)
                await joinRoom(channelId)
                setJoinComplete(true)
                joiningRooms.current = false
            })()
        }
    }, [channelId, clientRunning, joinRoom, joinTown, props.signer, spaceId])
    return (
        <>
            <RegisterWallet signer={props.signer} />
            <div data-testid="spaceMembership"> {mySpaceMembership} </div>
            <div data-testid="channelMembership"> {myChannelMembership} </div>
            <div data-testid="joinComplete">{joinComplete ? 'true' : 'false'}</div>
        </>
    )
}

export const RegisterAndJoin = (props: {
    signer: TSigner
    spaceId: string
    channelIds: string[]
}) => {
    const { spaceId, channelIds } = props
    const didExecute = useRef(false)
    const { clientRunning, joinTown, joinRoom } = useTownsClient()
    const [joinStatus, setJoinStatus] = useState<Record<string, boolean>>({})
    const [joinComplete, setJoinComplete] = React.useState(false)

    useEffect(() => {
        if (clientRunning && !didExecute.current && props.signer) {
            setJoinStatus((prev) => ({ ...prev, ['executing']: true }))
            didExecute.current = true
            void (async () => {
                await joinTown(spaceId, props.signer)
                setJoinStatus((prev) => ({ ...prev, [spaceId]: true }))
                for (const roomId of channelIds) {
                    await joinRoom(roomId)
                    setJoinStatus((prev) => ({ ...prev, [roomId]: true }))
                }

                setJoinComplete(true)
            })()
        }
    }, [clientRunning, joinTown, channelIds, spaceId, joinRoom, props.signer])
    return (
        <>
            <RegisterWallet signer={props.signer} />
            <div data-testid="joinStatus">{JSON.stringify(joinStatus)}</div>
            <div data-testid="joinComplete">{joinComplete ? 'true' : 'false'}</div>
        </>
    )
}

export function TransactionInfo<
    T extends
        | ReturnType<typeof useCreateSpaceTransactionWithRetries>
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
