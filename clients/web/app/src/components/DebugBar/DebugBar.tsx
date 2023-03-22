import React, { useState } from 'react'
import { Address, useBalance, useNetwork, useSwitchNetwork } from 'wagmi'
import { useEvent } from 'react-use-event-hook'
import { ethers, providers } from 'ethers'
import { useWeb3Context, useZionClient } from 'use-zion-client'
import { Box, Button, Divider, Stack, Text } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { shortAddress } from 'ui/utils/utils'
import { HomeServerUrl, UseHomeServerUrlReturn } from 'hooks/useMatrixHomeServerUrl'
import { useAuth } from 'hooks/useAuth'
import { useCorrectChainForServer } from 'hooks/useCorrectChainForServer'

type Props = {
    homeserverUrl: string
} & UseHomeServerUrlReturn

type ModalProps = {
    onHide: () => void
    platform: string
    synced: boolean
    homeserverUrl: string
    onNetworkSwitch: (chainId: number) => void
    onClearUrl: () => void
}

function areSynced(homeserverUrl: string, chainName: string) {
    const serverIsLocal = homeserverUrl.includes('localhost')
    const chainIsLocal = chainName.toLowerCase().includes('foundry')
    const localSync = serverIsLocal && chainIsLocal
    // the chain for the deployed app
    const testSync = !serverIsLocal && !chainIsLocal && chainName.toLowerCase().includes('goerli')
    const serverName = serverIsLocal ? 'local' : 'node1-test.towns.com'
    const platform = !chainName
        ? `Not connected | server:${serverName}`
        : `wallet: ${chainName} | server:${serverName}`

    return {
        synced: localSync || testSync,
        platform,
    }
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
    homeserverUrl,
    onHide,
    onNetworkSwitch,
    onClearUrl,
    platform,
}: ModalProps) => {
    const { accounts, provider } = useWeb3Context()
    const { chain } = useNetwork()
    const { chainId } = useZionClient()

    const { switchNetwork } = useSwitchNetwork({
        onSuccess: (chain) => {
            onNetworkSwitch(chain.id)
        },
    })

    const switchToLocal = () => {
        switchNetwork?.(31337)
    }

    const switchToTestnet = () => {
        switchNetwork?.(5)
    }

    const appChain = useCorrectChainForServer()

    return (
        <ModalContainer onHide={onHide}>
            <Stack gap="lg">
                <Text strong size="sm">
                    Server: {homeserverUrl}
                </Text>
                <Text strong size="sm">
                    Wallet Chain: {chain?.name || 'Not connected'}
                </Text>
                <Text strong size="sm">
                    App chain: {appChain.name}
                </Text>
                {chain?.name && (
                    <>
                        <Divider />

                        <Box shrink display="block">
                            <Text strong size="sm">
                                {chain.id === 31337 && 'Fund '}
                                Accounts
                            </Text>
                            <br />
                            {accounts.map((accountId) => (
                                <FundButton
                                    key={accountId}
                                    accountId={accountId}
                                    disabled={chain.id !== 31337}
                                    provider={provider}
                                    chainId={chainId}
                                />
                            ))}
                        </Box>

                        <Divider />

                        <Stack horizontal gap justifyContent="end">
                            <Button
                                size="button_xs"
                                tone="accent"
                                disabled={chain.id === 31337}
                                onClick={switchToLocal}
                            >
                                Switch to foundry/local
                            </Button>
                            <Button
                                size="button_xs"
                                tone="cta1"
                                disabled={chain.id === 5}
                                onClick={switchToTestnet}
                            >
                                Switch to goerli/node1-test.towns.com
                            </Button>
                            <Button size="button_xs" onClick={onClearUrl}>
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

const DebugBar = ({ homeserverUrl, setUrl, hasUrl, clearUrl }: Props) => {
    const { chain } = useNetwork()
    const { logout } = useAuth()

    const [modal, setModal] = useState(false)

    const onHide = useEvent(() => {
        setModal(false)
    })

    const onShow = useEvent(() => {
        setModal(true)
    })

    const { synced, platform } = areSynced(homeserverUrl, chain?.name || '')

    const appChain = useCorrectChainForServer()

    async function onNetworkSwitch(chainId: number) {
        if (chainId === 31337) {
            setUrl(HomeServerUrl.LOCAL)
        } else if (chainId === 5) {
            setUrl(HomeServerUrl.TEST)
        } else if (chainId === 11155111) {
            setUrl(HomeServerUrl.PROD)
        }
        await logout()
        window.location.href = 'http://localhost:3000'
    }

    function onClearUrl() {
        clearUrl()
    }

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
                    homeserverUrl={homeserverUrl}
                    platform={platform}
                    synced={synced}
                    onNetworkSwitch={onNetworkSwitch}
                    onClearUrl={onClearUrl}
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
                    {platform}&nbsp; | app using: {appChain.name}
                </Text>

                {hasUrl() && (
                    <Text as="span" size="sm" color="negative">
                        Local Storage
                    </Text>
                )}
            </Box>
        </Box>
    )
}

export default DebugBar
