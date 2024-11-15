import React from 'react'
import { Address } from 'use-towns-client'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'
import { Icon, IconButton, Paragraph, Stack } from '@ui'
import { useBalance } from 'hooks/useBalance'

export function WalletWithBalance({
    address,
    isAbstractAccount,
    UnlinkButton,
    onRemoveClick,
}: {
    address: Address
    isAbstractAccount: boolean
    UnlinkButton?: React.ReactNode
    onRemoveClick?: (address: Address) => void
}) {
    const balance = useBalance({
        address: address,
        watch: true,
    })

    return (
        <Stack horizontal gap="sm" justifyContent="spaceBetween" alignItems="center" width="100%">
            {isAbstractAccount && (
                <Stack gap="sm">
                    <Paragraph>Towns Wallet</Paragraph>
                    <ClipboardCopy
                        color={isAbstractAccount ? 'gray2' : 'gray1'}
                        label={shortAddress(address)}
                        clipboardContent={address}
                    />
                </Stack>
            )}
            {!isAbstractAccount && (
                <Stack horizontal centerContent gap="sm">
                    <ClipboardCopy
                        color={isAbstractAccount ? 'gray2' : 'gray1'}
                        label={shortAddress(address)}
                        clipboardContent={address}
                    />
                    {UnlinkButton}
                </Stack>
            )}
            <Stack horizontal centerContent gap="sm">
                {balance.data?.formatted ?? 0} {balance.data?.symbol ?? ''}
                <Icon type="base" size="square_sm" />
                {onRemoveClick && (
                    <IconButton
                        data-testid="wallet-with-balance-remove-wallet"
                        icon="close"
                        tooltip="Remove Wallet"
                        onClick={() => onRemoveClick?.(address)}
                    />
                )}
            </Stack>
        </Stack>
    )
}
