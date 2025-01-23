import React from 'react'
import { Address } from 'use-towns-client'
import { Box, Button, Icon, Paragraph, Text } from '@ui'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { WalletWithBalance } from '../Wallet/WalletWithBalance'
import { useUserOpTxModalContext } from './UserOpTxModalContext'

export function InsufficientBalanceForPayWithEth(props: {
    smartAccountAddress: Address | undefined
    onCopyClick: () => void
    showWalletWarning: boolean
    totalInEth: {
        full: string
        truncated: string
    }
}) {
    const { smartAccountAddress, onCopyClick, showWalletWarning, totalInEth } = props
    const { setView } = useUserOpTxModalContext()
    const chainName = useEnvironment().baseChain.name

    if (!smartAccountAddress) {
        return null
    }

    return (
        <Box gap="md">
            <Text strong textAlign="center">
                You need at least <Text display="inline-block">{totalInEth.full} ETH</Text>{' '}
                <Text display="inline-block">
                    on{' '}
                    <Text as="span" display="inline" color="coinbaseBlue">
                        Base
                    </Text>
                </Text>
            </Text>
            <Box background="level3" padding="md" rounded="sm">
                <WalletWithBalance
                    isAbstractAccount
                    address={smartAccountAddress}
                    onCopyClick={onCopyClick}
                />
            </Box>
            <Button rounded="lg" tone="cta1" onClick={() => setView('depositEth')}>
                <Icon type="plus" />
                Deposit ETH
            </Button>

            {showWalletWarning && (
                <Box centerContent padding horizontal gap rounded="sm" background="level3">
                    <Icon shrink={false} type="alert" />
                    <Paragraph>
                        Important! Only transfer assets on {chainName} to your Towns wallet.
                    </Paragraph>
                </Box>
            )}
        </Box>
    )
}
