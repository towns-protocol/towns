import React, { useCallback, useRef, useState } from 'react'
import { Address, useBalance, useNetwork } from 'wagmi'
import { useSwitchNetwork } from '@privy-io/wagmi-connector'
import { useEvent } from 'react-use-event-hook'
import { ethers, providers } from 'ethers'
import { mintMockNFT, useConnectivity, useWeb3Context } from 'use-zion-client'
import { debug } from 'debug'
import { Box, Button, Divider, Icon, Stack, Text } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { shortAddress } from 'ui/utils/utils'
import { isTouch } from 'hooks/useDevice'

import {
    ENVIRONMENTS,
    TownsEnvironment,
    TownsEnvironmentInfo,
    UseEnvironmentReturn,
} from 'hooks/useEnvironmnet'
import { useAuth } from 'hooks/useAuth'
import { env } from 'utils'

const CF_TUNNEL_PREFIX = env.VITE_CF_TUNNEL_PREFIX

const log = debug('app:DebugBar')

type Props = UseEnvironmentReturn

type ModalProps = {
    onHide: () => void
    platform: string
    synced: boolean
    environment?: TownsEnvironment
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

const goHome = () => (window.location.href = window.location.protocol + '//' + window.location.host)

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
        log('fundWallet tx', tx)
        const result = await wallet.sendTransaction(tx)
        log('fundWallet result', result)
        const receipt = await result.wait()
        log('fundWallet receipt', receipt)
        if (chainId === 31337 && provider) {
            // only support localhost anvil testing
            const mintTx = await mintMockNFT(chainId, provider, wallet, accountId)
            await mintTx.wait()
            log('fundWallet minted MockNFT', { walletAddress: accountId })
            console.log('fundWallet minted MockNFT', { walletAddress: accountId })
        }
    } catch (e) {
        console.error('fundWallet error', e)
    }
}

const FundButton = (props: FundProps & { disabled: boolean }) => {
    const balance = useBalance({ address: props.accountId, watch: true })
    return (
        <Stack gap>
            <Button
                width="300"
                disabled={props.disabled}
                size="button_xs"
                onClick={() => fundWallet(props)}
            >
                <>
                    <Text size="sm">Fund Wallet and Mint MockNFT</Text>
                    <Text size="sm">{shortAddress(props.accountId)}</Text>
                </>
            </Button>
            <Text size="sm" color="cta1">
                Balance: {balance.data?.formatted} {balance.data?.symbol}
            </Text>
        </Stack>
    )
}

const DebugModal = ({
    environment,
    casablancaUrl,
    chainId,
    chainName,
    onHide,
    onSwitchEnvironment,
    onClear,
}: ModalProps) => {
    const { accounts, provider } = useWeb3Context()
    const { chain: walletChain } = useNetwork()
    const { logout: libLogout } = useConnectivity()
    const { logout: fullLogout } = useAuth()
    return (
        <ModalContainer onHide={onHide}>
            <Stack gap="lg">
                <Text strong size="sm">
                    Environment:{' '}
                    {environment ??
                        `Default (${
                            ENVIRONMENTS.find((e) => e.casablancaUrl === casablancaUrl)?.name ||
                            'Unknown'
                        })`}
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

                        {CF_TUNNEL_PREFIX ? (
                            <Text color="error">Your environment is using tunnels</Text>
                        ) : (
                            <Stack gap justifyContent="end">
                                {ENVIRONMENTS.map((env) => (
                                    <Button
                                        key={env.name}
                                        size="button_xs"
                                        tone="accent"
                                        disabled={
                                            chainId === env.chainId &&
                                            walletChain.id === env.chainId &&
                                            environment === env.id
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

                                <Button
                                    size="button_xs"
                                    onClick={async () => {
                                        await libLogout()
                                        goHome()
                                    }}
                                >
                                    Logout from River
                                </Button>

                                <Button
                                    size="button_xs"
                                    onClick={async () => {
                                        await fullLogout()
                                        goHome()
                                    }}
                                >
                                    Logout from River + Privy
                                </Button>

                                <Button size="button_xs" onClick={onHide}>
                                    Cancel
                                </Button>
                            </Stack>
                        )}
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
        log('useSwitchNetwork creating promise')
        promiseRef.current = new Promise<number>((resolve, reject) => {
            resolveRef.current = resolve
            rejectRef.current = reject
        })
        log('useSwitchNetwork promise created', promiseRef.current)
    }

    const { switchNetwork } = useSwitchNetwork({
        onSuccess: (chain) => {
            log('switched network to', chain.name)
            resolveRef.current?.(chain.id)
        },
        onError: (error) => {
            console.error('switch network error', error)
            rejectRef.current?.(error)
        },
        onMutate: () => {
            log('switching network onMutate')
        },
        onSettled: () => {
            log('switching network onSettled')
        },
    })
    const executor = useCallback(
        async (chainId: number) => {
            log('useSwitchNetwork calling switchNetwork with chainId: ', {
                chainId,
                promise: promiseRef.current,
            })
            switchNetwork?.(chainId)
            try {
                log('useSwitchNetwork waiting for promise', promiseRef.current)
                const chainId = await promiseRef.current
                log('useSwitchNetwork promise resolved with chainId: ', chainId)
                return chainId
            } finally {
                // skip the catch, because we want to reject if things fail, but always reset
                log('useSwitchNetwork resetting promise')
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
    casablancaUrl,
    protocol,
    setEnvironment,
    clearEnvironment,
}: Props) => {
    const { chain } = useNetwork()
    const { logout } = useAuth()
    const [modal, setModal] = useState(false)
    const { signer } = useWeb3Context()

    const switchNetwork = useAsyncSwitchNetwork()

    const onSwitchEnvironment = useCallback(
        async (env: TownsEnvironmentInfo) => {
            log('onSwitchEnvironment', { env })
            if (env.chainId !== chain?.id) {
                log('onSwitchEnvironment switching chain')
                const newChainId = await switchNetwork?.(env.chainId)
                log('onSwitchEnvironment switched chain', { newChainId })
            }
            if (env.id !== environment) {
                log('onSwitchEnvironment logging out')
                await logout()
                log('onSwitchEnvironment updating environment')
                setEnvironment(env.id)
                goHome()
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

    const serverName = casablancaUrl?.replaceAll('https://', '').replaceAll('http://', '')

    const platform = !chain?.name ? ` ${serverName}` : `w: ${chain.id} | ${serverName}`

    const onClear = useCallback(() => {
        clearEnvironment()
    }, [clearEnvironment])

    const touch = isTouch()
    const { isConnected } = useAuth()

    return (
        <Box
            position="fixed"
            zIndex="tooltips"
            width="100%"
            paddingX="lg"
            paddingRight="x8"
            bottom="none"
            paddingY="xs"
            flexDirection="row"
            gap="sm"
            justifyContent={touch ? 'start' : 'end'}
        >
            {modal && (
                <DebugModal
                    environment={environment}
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
                {CF_TUNNEL_PREFIX ? (
                    <>
                        <Box
                            background="cta1"
                            rounded="full"
                            style={{ width: '15px', height: '15px' }}
                        />
                        <Text strong as="span" size="sm">
                            Tunnels
                        </Text>
                    </>
                ) : touch ? (
                    <>
                        <Box
                            background="cta1"
                            rounded="full"
                            style={{ width: '15px', height: '15px' }}
                        />
                    </>
                ) : (
                    <>
                        <Box>
                            {synced && (
                                <Box
                                    background={
                                        platform.toLowerCase().includes('foundry')
                                            ? 'accent'
                                            : 'cta1'
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
                        <Text strong as="span" size="xs">
                            {platform}&nbsp; | app: {destinationChainId} | Connected: &nbsp;
                            <Icon
                                display="inline-block"
                                size="square_xxs"
                                type={isConnected ? 'check' : 'alert'}
                                color={isConnected ? 'cta1' : 'error'}
                            />
                            | Signer: &nbsp;
                            <Icon
                                display="inline-block"
                                size="square_xxs"
                                type={signer ? 'check' : 'alert'}
                                color={signer ? 'cta1' : 'error'}
                            />
                        </Text>
                    </>
                )}
            </Box>
        </Box>
    )
}

export default DebugBar
