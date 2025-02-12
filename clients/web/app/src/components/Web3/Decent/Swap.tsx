import React from 'react'
import { BoxThemeProvider, SwapModal } from '@decent.xyz/the-box'
import { ClientRendered } from '@decent.xyz/box-ui'
import { ChainId, TokenInfo, getNativeTokenInfo } from '@decent.xyz/box-common'
import { Address, useConnectivity } from 'use-towns-client'
import { env } from 'utils'
import { chainIds, wagmiConfig } from 'wagmiConfig'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { Stack } from '@ui'
import { Analytics } from 'hooks/useAnalytics'
import { usePrivyConnectWallet } from '../ConnectWallet/usePrivyConnectWallet'
import { ConnectedWallet } from './ConnectedWallet'
import { decentTheme } from './decentTheme'
import { useSrcAndDstChains } from './useSrcAndDstChains'

export function Swap() {
    const { loggedInWalletAddress } = useConnectivity()
    const privyConnectWallet = usePrivyConnectWallet({
        onSuccess: (wallet) => {
            Analytics.getInstance().track('add funds connected wallet', {
                walletName: wallet.meta.name,
            })
        },
        onError: (error) => {
            console.error('[Swap] error connecting wallet', error)
        },
    })
    const { data: address, isLoading } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress as Address,
    })
    const { srcChain, dstChain } = useSrcAndDstChains()
    const { baseChain } = useEnvironment()

    if (isLoading) {
        return <></>
    }

    if (!address) {
        return <></>
    }

    return (
        <Stack>
            <ConnectedWallet />
            <BoxThemeProvider theme={decentTheme}>
                <ClientRendered>
                    <SwapModal
                        hideChangeWalletButton
                        enableTestnets={baseChain.id !== ChainId.BASE}
                        buttonText="Swap and Fund"
                        wagmiConfig={wagmiConfig}
                        apiKey={env.VITE_DECENT_API_KEY ?? ''}
                        chainIds={chainIds}
                        receiverAddress={address}
                        selectedSrcToken={{
                            chainId: srcChain,
                            tokenInfo: getNativeTokenInfo(srcChain) as TokenInfo,
                        }}
                        selectedDstToken={{
                            chainId: dstChain,
                            tokenInfo: getNativeTokenInfo(dstChain) as TokenInfo,
                        }}
                        onConnectWallet={privyConnectWallet}
                    />
                </ClientRendered>
            </BoxThemeProvider>
        </Stack>
    )
}
