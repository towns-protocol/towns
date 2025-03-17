import React, { useCallback, useState } from 'react'
import { Panel } from '@components/Panel/Panel'
import { Box, Button, Icon, IconName, Stack, Text } from '@ui'
import { shortAddress } from 'workers/utils'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { useStore } from 'store/store'
import { useTradingWalletAddresses } from './useTradingWalletAddresses'

export const TradingDepositPanel = () => {
    const { evmWalletAddress, solanaWalletAddress } = useTradingWalletAddresses()

    const setFundWalletModalOpen = useStore((state) => state.setFundWalletModalOpen)
    const handleDeposit = () => {
        setFundWalletModalOpen(true)
    }

    return (
        <Panel padding label="Deposit">
            {solanaWalletAddress && (
                <WalletRow walletAddress={solanaWalletAddress} name="Solana" iconName="solana" />
            )}
            {evmWalletAddress && (
                <WalletRow
                    walletAddress={evmWalletAddress}
                    name="Base ETH"
                    iconName="baseEth"
                    onClickFundWallet={handleDeposit}
                />
            )}
        </Panel>
    )
}

const WalletRow = ({
    walletAddress,
    name,
    iconName,
    onClickFundWallet,
}: {
    walletAddress: string
    name: string
    iconName: IconName
    onClickFundWallet?: () => void
}) => {
    const [copied, setCopied] = useState(false)
    const [, copy] = useCopyToClipboard()

    const handleCopy = useCallback(
        async (e: React.MouseEvent) => {
            e.preventDefault()
            const success = await copy(walletAddress)
            setCopied(success)
            if (success) {
                setTimeout(() => setCopied(false), 1000)
            }
        },
        [setCopied, copy, walletAddress],
    )
    return (
        <Stack horizontal padding gap background="level2" rounded="md">
            <Icon type={iconName} size="square_lg" />
            <Stack gap="sm">
                <Text color="default" fontWeight="medium">
                    {name}
                </Text>
                <Text color="gray2">{shortAddress(walletAddress)}</Text>
            </Stack>
            <Box grow />
            {onClickFundWallet && (
                <Button
                    icon="wallet"
                    size="button_sm"
                    rounded="full"
                    color="cta1"
                    onClick={onClickFundWallet}
                >
                    Add funds
                </Button>
            )}

            <Button icon="copy" size="button_sm" rounded="full" color="cta1" onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy'}
            </Button>
        </Stack>
    )
}
