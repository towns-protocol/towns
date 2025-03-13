import React, { useEffect } from 'react'
import { Address } from 'use-towns-client'
import { Box, Button, Icon, Paragraph, Text } from '@ui'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useBalance } from 'hooks/useBalance'
import { env } from 'utils'
import { trackClickedAddFunds } from '@components/Web3/Wallet/fundWalletAnalytics'
import { WalletWithBalance } from '@components/Web3/Wallet/WalletWithBalance'
import { CopyWalletAddressButton } from '@components/Web3/GatedTownModal/Buttons'
import { useUserOpTxModalContext } from './UserOpTxModalContext'
import { useIsJoinSpace } from './hooks/useIsJoinSpace'
export function InsufficientBalanceForPayWithEth(props: {
    smartAccountAddress: Address | undefined
    onCopyClick: () => void
    showWalletWarning: boolean
    cost: bigint
    totalInEth: {
        full: string
        truncated: string
    }
}) {
    const { smartAccountAddress, onCopyClick, showWalletWarning, totalInEth } = props
    const { setView } = useUserOpTxModalContext()
    const chainName = useEnvironment().baseChain.name

    const { data: balanceData } = useBalance({
        address: smartAccountAddress,
        enabled: !!smartAccountAddress,
        watch: true,
    })
    const isJoinSpace = useIsJoinSpace()

    useEffect(() => {
        if (balanceData?.value && balanceData.value >= props.cost) {
            // user funded wallet from elsewhere, go back to beginning
            setView(undefined)
        }
    }, [balanceData?.value, props.cost, setView])

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
            {env.VITE_ENABLE_CONFIRM_FUND_WALLET && (
                <Button
                    rounded="lg"
                    tone="cta1"
                    onClick={() => {
                        if (isJoinSpace) {
                            trackClickedAddFunds({ entrypoint: 'joinspace' })
                        }
                        setView('depositEth')
                    }}
                >
                    <Icon type="plus" />
                    Deposit ETH
                </Button>
            )}

            <CopyWalletAddressButton
                address={smartAccountAddress}
                text="Copy Address"
                onClick={onCopyClick}
            />

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
