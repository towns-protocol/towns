import React from 'react'
import { useConnectWallet } from '@privy-io/react-auth'
import { providers } from 'ethers'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { mapToErrorMessage } from '../utils'

type Wallet = Parameters<
    NonNullable<NonNullable<Parameters<typeof useConnectWallet>[0]>['onSuccess']>
>[0]['wallet']

export async function switchConnectedWalletChain(args: {
    wallet: Wallet
    baseChain: ReturnType<typeof useEnvironment>['baseChain']
    onSuccess: (signer: providers.JsonRpcSigner) => void
}) {
    const { wallet, baseChain, onSuccess } = args
    const chainString = baseChain.id.toString()
    if ('type' in wallet && wallet.type === 'ethereum') {
        let errorSubMessage: string | undefined = undefined
        if (!wallet.chainId.includes(chainString)) {
            try {
                await wallet.switchChain(baseChain.id)
            } catch (e) {
                console.error('[useConnectThenLink] error switching chain for connected wallet', e)
                errorSubMessage = mapToErrorMessage({
                    error: e as Error,
                    source: 'connect then link switch chain',
                })
            }
        }

        const privyProvider = await wallet.getEthereumProvider()
        const provider = new providers.Web3Provider(privyProvider)
        // switching the chain doesn't immediately update in `wallet` (ms later it does)
        // so we need to check the network
        const networkChainId = (await provider.getNetwork()).chainId

        if (networkChainId === baseChain.id) {
            onSuccess(provider.getSigner())
        } else {
            popupToast(({ toast }) => (
                <StandardToast.Error
                    toast={toast}
                    message={`Please make sure your wallet supports and is connected to the ${baseChain.name} network.`}
                    subMessage={errorSubMessage}
                />
            ))
        }
    } else {
        console.log('[switchConnectedWalletChain] unknown wallet type', wallet)
        popupToast(({ toast }) => (
            <StandardToast.Error
                toast={toast}
                message="We could not connect this wallet. Please make sure it is an EVM compatible wallet."
            />
        ))
    }
}
