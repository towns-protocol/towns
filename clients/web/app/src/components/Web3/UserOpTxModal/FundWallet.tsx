import React, { useState } from 'react'
import { Address, useTownsContext } from 'use-towns-client'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import {
    DecentTransactionReceipt,
    Onboarding,
    getDecentScanLink,
} from '@components/Web3/Decent/Onboarding'
import {
    trackConnectWallet,
    trackFundWalletTx,
    trackFundWalletTxStart,
} from '@components/Web3/Wallet/fundWalletAnalytics'
import { useUserOpTxModalContext } from './UserOpTxModalContext'
import { useMyAbstractAccountAddress } from './hooks/useMyAbstractAccountAddress'
import { useIsJoinSpace } from './hooks/useIsJoinSpace'

export const FundWallet = (props: { cost: bigint }) => {
    const { baseProvider } = useTownsContext()
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const { setView } = useUserOpTxModalContext()
    const [isCheckingBalance, setIsCheckingBalance] = useState(false)
    const isJoinSpace = useIsJoinSpace()

    return (
        <>
            <Onboarding
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
                        const receipt = r as DecentTransactionReceipt
                        const link = getDecentScanLink(receipt)
                        popupToast(({ toast }) => (
                            <StandardToast.Success
                                toast={toast}
                                message="You've added funds to your Towns Wallet!"
                                cta="View on DecentScan"
                                onCtaClick={() => {
                                    window.open(link, '_blank')
                                }}
                            />
                        ))
                        setIsCheckingBalance(true)
                        const isBalanceEnough = await checkBalance({
                            cost: props.cost,
                            provider: baseProvider,
                            myAbstractAccountAddress,
                        })
                        if (isBalanceEnough) {
                            setView(undefined)
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

async function checkBalance(props: {
    cost: bigint
    provider: ReturnType<typeof useTownsContext>['baseProvider']
    myAbstractAccountAddress: Address | undefined
}) {
    const now = Date.now()
    const endTime = now + 8_000
    if (!props.myAbstractAccountAddress) {
        return false
    }
    while (Date.now() < endTime) {
        try {
            const currentBalance = (
                await props.provider.getBalance(props.myAbstractAccountAddress)
            ).toBigInt()
            if (currentBalance >= props.cost) {
                return true
            }
            await new Promise((resolve) => setTimeout(resolve, 1_000))
        } catch (e) {
            console.error('[checkBalance] error', e)
        }
    }
    return false
}
