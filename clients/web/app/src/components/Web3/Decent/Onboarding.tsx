import React from 'react'
import { BoxThemeProvider, OnboardingModal } from '@decent.xyz/the-box'
import { ClientRendered } from '@decent.xyz/box-ui'
import { TokenInfo, getNativeTokenInfo } from '@decent.xyz/box-common'
import { Address, useConnectivity } from 'use-towns-client'
import { env } from 'utils'
import { chainIds, wagmiConfig } from 'wagmiConfig'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { Stack } from '@ui'
import { Analytics } from 'hooks/useAnalytics'
import { decentTheme } from './decentTheme'
import { useSrcAndDstChains } from './useSrcAndDstChains'
import { ConnectedWallet } from './ConnectedWallet'
import { usePrivyConnectWallet } from '../ConnectWallet/usePrivyConnectWallet'

export function Onboarding(
    props: {
        onTxSuccess?: (r: unknown) => void
        onTxError?: (error: unknown) => void
    } = {},
) {
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
                    />
                </ClientRendered>
            </BoxThemeProvider>
        </Stack>
    )
}
