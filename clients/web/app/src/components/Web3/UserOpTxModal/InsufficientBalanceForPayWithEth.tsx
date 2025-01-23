import React from 'react'
import { Address } from 'use-towns-client'
import { Box, Icon, Paragraph, Text } from '@ui'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { BRIDGE_LEARN_MORE_LINK } from 'data/links'
import { atoms } from 'ui/styles/atoms.css'
import { isTouch } from 'hooks/useDevice'
import { CopyWalletAddressButton } from '@components/Web3/GatedTownModal/Buttons'

export function InsufficientBalanceForPayWithEth(props: {
    smartAccountAddress: Address | undefined
    onCopyClick: () => void
    showWalletWarning: boolean
}) {
    const _isTouch = isTouch()
    const { smartAccountAddress, onCopyClick, showWalletWarning } = props
    const chainName = useEnvironment().baseChain.name

    return (
        <Box paddingTop="md" gap="md" width={!_isTouch ? '400' : undefined}>
            <Text size="sm" color="error">
                You need to bridge ETH on Base and then transfer to your towns wallet to pay with
                ETH.{' '}
                <Box
                    as="a"
                    gap="xs"
                    href={BRIDGE_LEARN_MORE_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={atoms({ color: 'default', display: 'inline' })}
                >
                    Learn how
                </Box>
            </Text>

            <CopyWalletAddressButton
                text="Copy Wallet Address"
                address={smartAccountAddress}
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
