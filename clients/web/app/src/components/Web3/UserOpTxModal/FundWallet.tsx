import React, { useState } from 'react'
import { getBalance } from 'wagmi/actions'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'

import {
    trackConnectWallet,
    trackFundWalletTx,
    trackFundWalletTxStart,
} from '@components/Web3/Wallet/fundWalletAnalytics'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { wagmiConfig } from 'wagmiConfig'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useUserOpTxModalContext } from './UserOpTxModalContext'
import { useIsJoinSpace } from './hooks/useIsJoinSpace'
import { EOAEthTransfer } from '../Decent/EOAEthTransfer'

export const FundWallet = (props: { cost: bigint }) => {
    const { baseChain } = useEnvironment()
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const { setView } = useUserOpTxModalContext()
    const [isCheckingBalance, setIsCheckingBalance] = useState(false)
    const isJoinSpace = useIsJoinSpace()

    return (
        <>
            <EOAEthTransfer
                onConnectWallet={(wallet) => {
                    if (isJoinSpace) {
                        trackConnectWallet({
                            walletName: wallet.meta.name ?? 'unknown',
                            entrypoint: 'joinspace',
                        })
                    }
                }}
                onTxStart={(args) => {
                    if (isJoinSpace) {
                        trackFundWalletTxStart(args, 'joinspace')
                    }
                }}
                onTxSuccess={async (r) => {
                    if (r) {
                        if (isJoinSpace) {
                            trackFundWalletTx({
                                success: true,
                                entrypoint: 'joinspace',
                            })
                        }
                        popupToast(({ toast }) => (
                            <StandardToast.Success
                                toast={toast}
                                message="You've added funds to your Towns Wallet!"
                            />
                        ))
                        setIsCheckingBalance(true)
                        if (myAbstractAccountAddress) {
                            try {
                                const balance = await getBalance(wagmiConfig, {
                                    chainId: baseChain.id,
                                    address: myAbstractAccountAddress,
                                })
                                if (balance.value >= props.cost) {
                                    setView(undefined)
                                } else {
                                    setView('payEth')
                                }
                            } catch (error) {
                                setView('payEth')
                            }
                        } else {
                            setView('payEth')
                        }
                        setIsCheckingBalance(false)
                    }
                }}
                onTxError={(e) => {
                    console.error('[Fund Wallet Tx from UserOpTxModal] error', e)
                    if (isJoinSpace) {
                        trackFundWalletTx({
                            success: false,
                            entrypoint: 'joinspace',
                        })
                    }
                    popupToast(({ toast }) => (
                        <StandardToast.Error
                            toast={toast}
                            message="There was an error adding funds to your Towns Wallet"
                        />
                    ))
                }}
            />
            {isCheckingBalance && <FullPanelOverlay text="Checking balance..." />}
        </>
    )
}
