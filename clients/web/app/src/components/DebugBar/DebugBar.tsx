import React, { useCallback, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { ethers, providers } from 'ethers'
import {
    Address,
    BaseChainConfig,
    mintMockNFT,
    useConnectivity,
    useTownsContext,
} from 'use-towns-client'
import { debug } from 'debug'
import { isAddress } from 'ethers/lib/utils'
import { usePrivy } from '@privy-io/react-auth'
import { useEmbeddedWallet } from '@towns/privy'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { Box, Button, Divider, Stack, Text, TextField } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { shortAddress } from 'ui/utils/utils'
import { isTouch } from 'hooks/useDevice'

import { ENVIRONMENTS, TownsEnvironmentInfo, UseEnvironmentReturn } from 'hooks/useEnvironmnet'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { useMockNftBalance } from 'hooks/useMockNftBalance'
import { useBalance } from 'hooks/useBalance'

const log = debug('app:DebugBar')
const anvilKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

type ModalProps = {
    onHide: () => void
    platform: string
    synced: boolean
    environment: UseEnvironmentReturn
}

type FundProps = {
    accountId: Address
    provider?: providers.BaseProvider
    chainId?: number
    chainConfig?: BaseChainConfig
}

const goHome = () => (window.location.href = window.location.protocol + '//' + window.location.host)

async function fundWallet({ accountId, provider, chainId }: FundProps) {
    try {
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
    } catch (e) {
        console.error('fundWallet error', e)
    }
}

async function mint({ accountId, provider, chainId, chainConfig }: FundProps) {
    const wallet = new ethers.Wallet(anvilKey, provider)
    try {
        if (chainId === 31337 && provider && chainConfig) {
            // only support localhost anvil testing
            const mintTx = await mintMockNFT(provider, chainConfig, wallet, accountId)
            await mintTx.wait()
            log(' minted MockNFT', { walletAddress: accountId })
            console.log(' minted MockNFT', { walletAddress: accountId })
        }
    } catch (e) {
        console.error(' minted MockNFT error', e)
    }
}

const FundButton = (props: FundProps & { disabled: boolean }) => {
    const [addressToFund, setAddressToFund] = useState(props.accountId)
    const balance = useBalance({
        address: addressToFund,
        watch: true,
        enabled: isAddress(addressToFund),
    })

    const { data: mockNftBalance } = useMockNftBalance(addressToFund)

    return (
        <Stack gap>
            <TextField
                defaultValue={addressToFund}
                border="default"
                onChange={(e) => {
                    isAddress(e.target.value)
                        ? setAddressToFund(e.target.value as Address)
                        : setAddressToFund('0x')
                }}
            />
            <Button
                width="300"
                disabled={props.disabled || !isAddress(addressToFund)}
                size="button_xs"
                onClick={() =>
                    fundWallet({
                        ...props,
                        accountId: addressToFund,
                    })
                }
            >
                <>
                    <Text size="sm">Fund Wallet</Text>
                    <Text size="sm">{shortAddress(addressToFund)}</Text>
                </>
            </Button>
            <Button
                width="300"
                disabled={props.disabled || !isAddress(addressToFund)}
                size="button_xs"
                onClick={() =>
                    mint({
                        ...props,
                        accountId: addressToFund,
                    })
                }
            >
                <>
                    <Text size="sm">Mint Mock NFT</Text>
                    <Text size="sm">{shortAddress(addressToFund)}</Text>
                </>
            </Button>
            <Text size="sm" color="cta1">
                Balance: {balance.data?.formatted} {balance.data?.symbol}
                Mock NFT: {mockNftBalance}
            </Text>
        </Stack>
    )
}

const DebugModal = ({ onHide, environment }: ModalProps) => {
    const { baseProvider: provider, baseChain } = useTownsContext()
    const walletChain = baseChain
    const { logout: libLogout } = useConnectivity()
    const { logout: fullLogout } = useCombinedAuth()
    const { logout: privyLogout } = usePrivy()
    const { loggedInWalletAddress } = useConnectivity()
    const { setEnvironment, clearEnvironment } = environment

    const switchNetwork = useAsyncSwitchNetwork()

    const onSwitchEnvironment = useCallback(
        async (env: TownsEnvironmentInfo) => {
            log('onSwitchEnvironment', { env })
            if (env.baseChain.id !== environment.baseChain.id) {
                log('onSwitchEnvironment switching chain')
                const newChainId = await switchNetwork?.(env.baseChain.id)
                log('onSwitchEnvironment switched chain', { newChainId })
            }
            if (env.id !== environment.id) {
                log('onSwitchEnvironment logging out')
                await fullLogout()
                log('onSwitchEnvironment updating environment')
                setEnvironment(env.id)
                goHome()
            }
        },
        [environment, fullLogout, setEnvironment, switchNetwork],
    )

    const onClear = useCallback(() => {
        clearEnvironment()
    }, [clearEnvironment])

    return (
        <ModalContainer onHide={onHide}>
            <Stack gap="lg">
                <Text strong size="sm">
                    Environment: {environment.id}
                </Text>
                <Text strong size="sm">
                    Wallet Chain: {walletChain?.name || 'Not connected'}{' '}
                    {walletChain?.id !== environment.baseChain.id && '(Mismatch)'}
                </Text>
                <Text strong size="sm">
                    App chain: {environment.baseChain.name}
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
                            {loggedInWalletAddress && (
                                <FundButton
                                    key={loggedInWalletAddress}
                                    accountId={loggedInWalletAddress}
                                    disabled={walletChain.id !== 31337}
                                    provider={provider}
                                    chainId={environment.baseChain.id}
                                />
                            )}
                        </Box>

                        <Divider />

                        <Stack gap justifyContent="end">
                            {ENVIRONMENTS.map((env) => (
                                <Button
                                    key={env.name}
                                    size="button_xs"
                                    tone="accent"
                                    disabled={
                                        environment.baseChain.id === env.baseChain.id &&
                                        walletChain.id === env.baseChain.id &&
                                        environment.id === env.id
                                    }
                                    onClick={() => onSwitchEnvironment(env)}
                                >
                                    Switch to {env.name}/{env.baseChain.name}
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
                                    await privyLogout()
                                    onHide()
                                }}
                            >
                                Logout from Privy
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
    const embeddedWallet = useEmbeddedWallet()

    if (!promiseRef.current) {
        log('useSwitchNetwork creating promise')
        promiseRef.current = new Promise<number>((resolve, reject) => {
            resolveRef.current = resolve
            rejectRef.current = reject
        })
        log('useSwitchNetwork promise created', promiseRef.current)
    }

    const switchNetwork = useCallback(
        async (chainId: number) => {
            try {
                await embeddedWallet?.switchChain(chainId)
                log('switched network to', chainId)
                resolveRef.current?.(chainId)
            } catch (error) {
                console.error('switch network error', error)
                rejectRef.current?.(error as Error)
            }
        },
        [embeddedWallet],
    )

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

const DebugBar = (environment: UseEnvironmentReturn) => {
    const chain = environment.baseChain
    const [modal, setModal] = useState(false)
    const { accountAbstractionConfig } = environment

    const onHide = useEvent(() => {
        setModal(false)
    })

    const onShow = useEvent(() => {
        setModal(true)
    })

    const connectedChainId = chain?.id
    const synced = environment.baseChain.id === connectedChainId

    const serverName = environment.id

    const platform = !chain?.name ? ` ${serverName}` : `w: ${chain.id} | ${serverName}`

    const touch = isTouch()

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
                <PrivyWrapper>
                    <DebugModal
                        environment={environment}
                        platform={platform}
                        synced={synced}
                        onHide={onHide}
                    />
                </PrivyWrapper>
            )}
            <Box flexDirection="row" alignItems="center" cursor="pointer" gap="sm" onClick={onShow}>
                {touch ? (
                    <>
                        <Box
                            background="cta1"
                            rounded="full"
                            style={{ width: '15px', height: '15px' }}
                        />
                    </>
                ) : (
                    <>
                        <Text size="sm">
                            {accountAbstractionConfig && '4337 ON'}
                            {accountAbstractionConfig?.paymasterProxyUrl && ' $$'}
                        </Text>

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
                            {platform}&nbsp; | app: {environment.baseChain.id} | Connected: &nbsp;
                        </Text>
                    </>
                )}
            </Box>
        </Box>
    )
}

export default DebugBar
