import React, { useCallback, useState } from 'react'
import { Box, Button, Icon, MotionBox, Text } from '@ui'
import { useBalance } from 'hooks/useBalance'
import { DecentTransactionReceipt, Onboarding, getDecentScanLink } from '../../Decent/Onboarding'
import { trackFundWalletTx } from '../../Wallet/fundWalletAnalytics'
import { useUserOpTxModalContext } from './UserOpTxModalContext'
import { useMyAbstractAccountAddress } from './hooks/useMyAbstractAccountAddress'

export const FundWallet = (props: { cost: bigint }) => {
    const [result, setResult] = useState<{
        status: 'success' | 'error' | undefined
        link?: string
    }>({
        status: undefined,
        link: undefined,
    })

    if (result.status) {
        return <ResultBox status={result.status} link={result.link} cost={props.cost} />
    }

    return (
        <Onboarding
            onTxSuccess={(r) => {
                if (r) {
                    trackFundWalletTx({ success: true })
                    const receipt = r as DecentTransactionReceipt
                    const link = getDecentScanLink(receipt)
                    setResult({ status: 'success', link })
                }
            }}
            onTxError={(e) => {
                console.error('[Fund Wallet Tx from UserOpTxModal] error', e)
                // for now we don't need to set the result here
                // since decent has their own error modal that pops up
                trackFundWalletTx({ success: false })
            }}
        />
    )
}

const ResultBox = (props: {
    status: 'success' | 'error'
    link: string | undefined
    cost: bigint
}) => {
    const { setView } = useUserOpTxModalContext()
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data

    const { data: balanceData } = useBalance({
        address: myAbstractAccountAddress,
        enabled: !!myAbstractAccountAddress,
        watch: true,
    })

    const setDestinationView = useCallback(() => {
        if (balanceData?.value && balanceData.value >= props.cost) {
            // go back to beginning
            // user can proceed with the transaction
            setView(undefined)
        } else {
            setView('payEth')
        }
    }, [setView, balanceData?.value, props.cost])

    const isSuccess = props.status === 'success'
    const message = isSuccess
        ? "You've added funds to your Towns Wallet!"
        : 'Something went wrong. Could not add funds to your Towns Wallet.'

    return (
        <Box centerContent gap="md" paddingBottom="md">
            <Box horizontal centerContent gap="sm">
                <Box background="level3" rounded="sm" padding="sm">
                    <Icon
                        type={isSuccess ? 'check' : 'alert'}
                        color={isSuccess ? 'positive' : 'negative'}
                        size="square_sm"
                        shrink={false}
                    />
                </Box>
                <Text>{message}</Text>
            </Box>

            {isSuccess && (
                <Button
                    tone="none"
                    color="cta1"
                    size="inline"
                    onClick={() => window.open(props.link, '_blank')}
                >
                    <Text size="sm">View on DecentScan</Text>
                </Button>
            )}

            <MotionBox
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 4, ease: 'linear' }}
                position="absolute"
                bottom="none"
                background="level4"
                left="none"
                height="x1"
                width="100%"
                onAnimationComplete={setDestinationView}
            />
        </Box>
    )
}
