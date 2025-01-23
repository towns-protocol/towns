import React from 'react'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { useStore } from 'store/store'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { Analytics } from 'hooks/useAnalytics'
import { Onboarding } from '../Decent/Onboarding'

export const FundWalletModal = () => {
    const fundWalletModalOpen = useStore((state) => state.fundWalletModalOpen)
    const setFundWalletModalOpen = useStore((state) => state.setFundWalletModalOpen)
    if (!fundWalletModalOpen) {
        return null
    }
    return (
        <ModalContainer maxWidth="400" onHide={() => setFundWalletModalOpen(false)}>
            <Onboarding
                onTxSuccess={(r) => {
                    if (r) {
                        setFundWalletModalOpen(false)
                        trackTx({ success: true })
                        const receipt = r as TransactionReceipt
                        const link = `https://www.decentscan.xyz/?chainId=${receipt.chainId}&txHash=${receipt.transactionHash}`

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
                    }
                }}
                onTxError={(e) => {
                    console.error('[Fund Wallet Tx] error', e)
                    trackTx({ success: false })
                }}
            />
        </ModalContainer>
    )
}

const trackTx = (args: { success: boolean }) => {
    const { success } = args
    Analytics.getInstance().track('added funds', {
        success,
    })
}

// decent receipt is type of `unknown`, this is what is logged:
type TransactionReceipt = {
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
