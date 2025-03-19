import React from 'react'
import { BoxThemeProvider, OnboardingModal } from '@decent.xyz/the-box'
import { ClientRendered } from '@decent.xyz/box-ui'
import { TokenInfo, getNativeTokenInfo } from '@decent.xyz/box-common'
import { Address } from 'use-towns-client'
import { env } from 'utils'
import { chainIds, wagmiConfig } from 'wagmiConfig'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { Icon, Stack, Text } from '@ui'
import { Analytics } from 'hooks/useAnalytics'
import { decentTheme } from './decentTheme'
import { useSrcAndDstChains } from './useSrcAndDstChains'
import { ConnectedWallet } from './ConnectedWallet'
import { usePrivyConnectWallet } from '../ConnectWallet/usePrivyConnectWallet'
import { DecentFund } from './fund/DecentFund'
import { useActiveWalletIsPrivy, useIsWagmiConnected } from './useActiveWalletIsPrivy'
import { SelectDifferentWallet, useNonPrivyWallets } from './SelectDifferentWallet'
import { ConnectAndSetActive } from './ConnectAndSetActive'
import { FundWalletCallbacks } from './fund/types'

export function Onboarding(props: FundWalletCallbacks = {}) {
    const { data: address, isLoading } = useMyAbstractAccountAddress()

    if (isLoading) {
        return <></>
    }

    if (!address) {
        return <></>
    }

    return (
        <Stack gap="sm">
            <ConnectedWallet />
            <BoxThemeProvider theme={decentTheme}>
                {env.VITE_ENABLE_DECENT_ONBOARDING_V2 ? (
                    <DecentFund
                        onTxStart={props.onTxStart}
                        onConnectWallet={props.onConnectWallet}
                        onTxSuccess={props.onTxSuccess}
                        onTxError={props.onTxError}
                    />
                ) : (
                    <OnboardingV1 {...props} address={address} />
                )}
            </BoxThemeProvider>
        </Stack>
    )
}

function OnboardingV1(props: {
    onTxSuccess?: (r: unknown) => void
    onTxError?: (error: unknown) => void
    address: Address
}) {
    const { address } = props

    const privyConnectWallet = usePrivyConnectWallet({
        onSuccess: ({ wallet }) => {
            Analytics.getInstance().track('add funds connected wallet', {
                walletName: wallet.meta.name,
            })
        },
        onError: (error) => {
            console.error('[Swap] error connecting wallet', error)
        },
    })
    const isPrivyWalletActive = useActiveWalletIsPrivy()
    const isWagmiConnected = useIsWagmiConnected()
    const nonPrivyWallets = useNonPrivyWallets()

    const { srcChain, dstChain } = useSrcAndDstChains()

    // need to connect a wallet
    if (nonPrivyWallets.length === 0 || !isWagmiConnected) {
        return (
            <Stack gap="lg" alignItems="center">
                <Icon size="square_xl" type="baseEth" />
                <Text textAlign="center">{`To add ETH to your Towns account, connect a wallet with funds.`}</Text>
                <ConnectAndSetActive />
            </Stack>
        )
    }

    if (isPrivyWalletActive) {
        return <SelectDifferentWallet />
    }

    return (
        <Stack gap="sm">
            <BoxThemeProvider theme={decentTheme}>
                <ClientRendered>
                    <OnboardingModal
                        buttonText="Fund"
                        wagmiConfig={wagmiConfig}
                        apiKey={env.VITE_DECENT_API_KEY ?? ''}
                        chainIds={chainIds}
                        receiverAddress={address}
                        sendInfoTooltip="Send funds to this address to fund your account."
                        selectedSrcToken={{
                            chainId: srcChain,
                            tokenInfo: getNativeTokenInfo(srcChain) as TokenInfo,
                        }}
                        selectedDstToken={{
                            chainId: dstChain,
                            tokenInfo: getNativeTokenInfo(dstChain) as TokenInfo,
                        }}
                        onConnectWallet={privyConnectWallet}
                        onTxReceipt={props.onTxSuccess}
                        onTxError={props.onTxError}
                        onTxPending={() => {
                            // this does not actually fire
                            // but if it did then we would want to disable modals from closing during this time
                        }}
                    />
                </ClientRendered>
            </BoxThemeProvider>
        </Stack>
    )
}

// decent receipt is type of `unknown`, this is what is logged:
export type DecentTransactionReceipt = {
    blockHash: string
    blockNumber: bigint
    chainId: number
    contractAddress: string | null
    cumulativeGasUsed: bigint
    effectiveGasPrice: bigint
    from: string
    gasUsed: bigint
    logs: Array<Log>
    logsBloom: string
    status: 'success' | 'failure'
    to: string
    transactionHash: string
    transactionIndex: number
    type: 'eip1559'
}

type Log = {
    address: string
    topics: string[]
    data: string
    blockNumber: bigint
    transactionHash: string
    transactionIndex: number
    blockHash: string
}

export function getDecentScanLink(receipt: DecentTransactionReceipt) {
    return `https://www.decentscan.xyz/?chainId=${receipt.chainId}&txHash=${receipt.transactionHash}`
}
