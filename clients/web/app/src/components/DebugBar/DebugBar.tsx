import React, { useCallback, useRef, useState } from 'react'
import { Address, useBalance, useNetwork, useSwitchNetwork } from 'wagmi'
import { useEvent } from 'react-use-event-hook'
import { ethers, providers } from 'ethers'
import { useWeb3Context } from 'use-zion-client'
import { Box, Button, Divider, Stack, Text } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { shortAddress } from 'ui/utils/utils'
import { useDevice } from 'hooks/useDevice'

import {
    ENVIRONMENTS,
    TownsEnvironment,
    TownsEnvironmentInfo,
    UseEnvironmentReturn,
} from 'hooks/useEnvironmnet'
import { useAuth } from 'hooks/useAuth'

type Props = UseEnvironmentReturn

type ModalProps = {
    onHide: () => void
    platform: string
    synced: boolean
    environment?: TownsEnvironment
    matrixUrl: string
    casablancaUrl?: string
    chainId: number
    chainName: string
    onSwitchEnvironment: (env: TownsEnvironmentInfo) => void
    onClear: () => void
}

type FundProps = {
    accountId: Address
    provider?: providers.BaseProvider
    chainId?: number
}

async function fundWallet({ accountId, provider, chainId }: FundProps) {
    try {
        const anvilKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
        const wallet = new ethers.Wallet(anvilKey, provider)

        const amount = 0.1

        const tx = {
            from: wallet.address,
            to: accountId,
            value: ethers.utils.parseEther(amount.toString()),
            gasLimit: 1000000,
            chainId: chainId,
        }

        console.log('fundWallet tx', tx)
        const result = await wallet.sendTransaction(tx)
        console.log('fundWallet result', result)
        const receipt = await result.wait()
        console.log('fundWallet receipt', receipt)
    } catch (e) {
        console.error('fundWallet error', e)
    }
}

const FundButton = (props: FundProps & { disabled: boolean }) => {
    const balance = useBalance({ address: props.accountId, watch: true })
    return (
        <Button disabled={props.disabled} size="button_xs" onClick={() => fundWallet(props)}>
            <>
                <Text size="sm">{shortAddress(props.accountId)}</Text>
                <Text size="sm" color="negative">
                    Balance: {balance.data?.formatted} {balance.data?.symbol}
                </Text>
            </>
        </Button>
    )
}

const DebugModal = ({
    environment,
    matrixUrl,
    casablancaUrl,
    chainId,
    chainName,
    onHide,
    onSwitchEnvironment,
    onClear,
}: ModalProps) => {
    const { accounts, provider } = useWeb3Context()
    const { chain: walletChain } = useNetwork()
    const { isMobile } = useDevice()

    return (
        <ModalContainer onHide={onHide}>
            <Stack gap="lg">
                <Text strong size="sm">
                    Environment:{' '}
                    {environment ??
                        `Default (${
                            ENVIRONMENTS.find((e) => e.matrixUrl === matrixUrl)?.name || 'Unknown'
                        })`}
                </Text>
                <Text strong size="sm">
                    MatrixUrl: {matrixUrl}
                </Text>
                <Text strong size="sm">
                    CasablancaUrl: {!casablancaUrl ? 'Not Set' : casablancaUrl}
                </Text>
                <Text strong size="sm">
                    Wallet Chain: {walletChain?.name || 'Not connected'}{' '}
                    {walletChain?.id !== chainId && '(Mismatch)'}
                </Text>
                <Text strong size="sm">
                    App chain: {chainName}
                </Text>
                {walletChain?.name && (
                    <>
                        <Divider />

                        <Box shrink display="block">
                            <Text strong size="sm">
                                {walletChain.id === 31337 && 'Fund '}
                                Accounts
                            </Text>
                            <br />
                            {accounts.map((accountId) => (
                                <FundButton
                                    key={accountId}
                                    accountId={accountId}
                                    disabled={walletChain.id !== 31337}
                                    provider={provider}
                                    chainId={chainId}
                                />
                            ))}
                        </Box>

                        <Divider />

                        <Stack gap horizontal={!isMobile} justifyContent="end">
                            {ENVIRONMENTS.map((env) => (
                                <Button
                                    key={env.name}
                                    size="button_xs"
                                    tone="accent"
                                    disabled={
                                        chainId === env.chainId && walletChain.id === env.chainId
                                    }
                                    onClick={() => onSwitchEnvironment(env)}
                                >
                                    Switch to {env.name}/{env.chain.name}
                                </Button>
                            ))}
                            <Button size="button_xs" onClick={onClear}>
                                <Text size="sm" color="default">
                                    Clear Local Storage
                                </Text>
                            </Button>
                            <Button size="button_xs" onClick={onHide}>
                                Cancel
                            </Button>
                        </Stack>
                    </>
                )}
            </Stack>
        </ModalContainer>
    )
}

const useAsyncSwitchNetwork = () => {
    const promiseRef = useRef<Promise<number>>()
    const resolveRef = useRef<(chainId: number) => void>()
    const rejectRef = useRef<(error: Error) => void>()

    if (!promiseRef.current) {
        console.log('useSwitchNetwork creating promise')
        promiseRef.current = new Promise<number>((resolve, reject) => {
            resolveRef.current = resolve
            rejectRef.current = reject
        })
        console.log('useSwitchNetwork promise created', promiseRef.current)
    }

    const { switchNetwork } = useSwitchNetwork({
        onSuccess: (chain) => {
            console.log('switched network to', chain.name)
            resolveRef.current?.(chain.id)
        },
        onError: (error) => {
            console.error('switch network error', error)
            rejectRef.current?.(error)
        },
        onMutate: () => {
            console.log('switching network onMutate')
        },
        onSettled: () => {
            console.log('switching network onSettled')
        },
    })
    const executor = useCallback(
        async (chainId: number) => {
            console.log('useSwitchNetwork calling switchNetwork with chainId: ', {
                chainId,
                promise: promiseRef.current,
            })
            switchNetwork?.(chainId)
            try {
                console.log('useSwitchNetwork waiting for promise', promiseRef.current)
                const chainId = await promiseRef.current
                console.log('useSwitchNetwork promise resolved with chainId: ', chainId)
                return chainId
            } finally {
                // skip the catch, because we want to reject if things fail, but always reset
                console.log('useSwitchNetwork resetting promise')
                promiseRef.current = new Promise<number>((resolve, reject) => {
                    resolveRef.current = resolve
                    rejectRef.current = reject
                })
            }
        },
        [switchNetwork],
    )
    return executor
}

const DebugBar = ({
    environment,
    chainId: destinationChainId,
    chainName: destinationChainName,
    matrixUrl,
    casablancaUrl,
    setEnvironment,
    clearEnvironment,
}: Props) => {
    const { chain } = useNetwork()
    const { logout } = useAuth()

    const [modal, setModal] = useState(false)

    const switchNetwork = useAsyncSwitchNetwork()

    const onSwitchEnvironment = useCallback(
        async (env: TownsEnvironmentInfo) => {
            console.log('onSwitchEnvironment', { env })
            if (env.chainId !== chain?.id) {
                console.log('onSwitchEnvironment switching chain')
                const newChainId = await switchNetwork?.(env.chainId)
                console.log('onSwitchEnvironment switched chain', { newChainId })
            }
            if (env.id !== environment) {
                console.log('onSwitchEnvironment logging out')
                await logout()
                console.log('onSwitchEnvironment updating environment')
                setEnvironment(env.id)
                window.location.href = 'http://localhost:3000'
            }
        },
        [chain?.id, environment, logout, setEnvironment, switchNetwork],
    )

    const onHide = useEvent(() => {
        setModal(false)
    })

    const onShow = useEvent(() => {
        setModal(true)
    })

    const connectedChainId = chain?.id
    const synced = destinationChainId === connectedChainId
    const serverName = matrixUrl.replaceAll('https://', '').replaceAll('http://', '')
    const platform = !chain?.name
        ? `Not connected | server:${serverName}`
        : `wallet: ${chain.name} | server:${serverName}`

    const onClear = useCallback(() => {
        clearEnvironment()
    }, [clearEnvironment])

    return (
        <Box
            position="fixed"
            zIndex="tooltips"
            width="100%"
            paddingX="md"
            bottom="none"
            paddingY="xs"
            flexDirection="row"
            gap="sm"
            justifyContent="end"
        >
            {modal && (
                <DebugModal
                    environment={environment}
                    matrixUrl={matrixUrl}
                    casablancaUrl={casablancaUrl}
                    chainId={destinationChainId}
                    chainName={destinationChainName}
                    platform={platform}
                    synced={synced}
                    onSwitchEnvironment={onSwitchEnvironment}
                    onClear={onClear}
                    onHide={onHide}
                />
            )}
            <Box flexDirection="row" alignItems="center" cursor="pointer" gap="sm" onClick={onShow}>
                <Box>
                    {synced && (
                        <Box
                            background={
                                platform.toLowerCase().includes('foundry') ? 'accent' : 'cta1'
                            }
                            rounded="full"
                            style={{ width: '15px', height: '15px' }}
                        />
                    )}
                    {!synced && (
                        <Box
                            border="negative"
                            rounded="full"
                            style={{ width: '15px', height: '15px' }}
                        >
                            {' '}
                        </Box>
                    )}
                </Box>

                <Text strong as="span" size="sm">
                    {platform}&nbsp; | app using: {destinationChainName}
                </Text>

                {environment && (
                    <Text as="span" size="sm" color="negative">
                        Local Storage
                    </Text>
                )}
            </Box>
        </Box>
    )
}

export default DebugBar
