import React, { useCallback, useState } from 'react'
import { Panel } from '@components/Panel/Panel'
import { Box, Button, Icon, IconName, Stack, Text } from '@ui'
import { shortAddress } from 'workers/utils'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { useTradingWalletAddresses } from './useTradingWalletAddresses'
export const TradingDepositPanel = () => {
    const { evmWalletAddress, solanaWalletAddress } = useTradingWalletAddresses()

    return (
        <Panel padding label="Deposit">
            {solanaWalletAddress && (
                <WalletRow walletAddress={solanaWalletAddress} name="Solana" iconName="baseEth" />
            )}
            {evmWalletAddress && (
                <WalletRow walletAddress={evmWalletAddress} name="Base ETH" iconName="baseEth" />
            )}
        </Panel>
    )
}

const WalletRow = ({
    walletAddress,
    name,
    iconName,
}: {
    walletAddress: string
    name: string
    iconName: IconName
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
            <Button icon="copy" size="button_sm" rounded="full" color="cta1" onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy'}
            </Button>
        </Stack>
    )
}
