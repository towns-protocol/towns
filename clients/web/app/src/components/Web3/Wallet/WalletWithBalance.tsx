import React from 'react'
import { Address } from 'use-towns-client'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'
import { Icon, IconButton, Paragraph, Stack } from '@ui'
import { useBalance } from 'hooks/useBalance'
import { useWalletPrefix } from '../useWalletPrefix'

export function WalletWithBalance({
    address,
    isAbstractAccount,
    isDisabled,
    onUnlinkClick,
    onRemoveClick,
}: {
    address: Address
    isAbstractAccount: boolean
    isDisabled: boolean
    onUnlinkClick?: (address: Address) => void
    onRemoveClick?: (address: Address) => void
}) {
    const balance = useBalance({
        address: address,
        watch: true,
    })
    const walletPrefix = useWalletPrefix()

    return (
        <Stack horizontal gap="sm" justifyContent="spaceBetween" alignItems="center" width="100%">
            {isAbstractAccount && (
                <Stack gap="sm">
                    <Paragraph>Towns Wallet</Paragraph>
                    <ClipboardCopy
                        color={isAbstractAccount ? 'gray2' : 'gray1'}
                        label={shortAddress(address)}
                        clipboardContent={
                            isAbstractAccount ? `${walletPrefix}:${address}` : address
                        }
                    />
                </Stack>
            )}
            {!isAbstractAccount && (
                <Stack horizontal centerContent gap="sm">
                    <ClipboardCopy
                        color={isAbstractAccount ? 'gray2' : 'gray1'}
                        label={shortAddress(address)}
                        clipboardContent={
                            isAbstractAccount ? `${walletPrefix}:${address}` : address
                        }
                    />
                    {onUnlinkClick && (
                        <IconButton
                            cursor={isDisabled ? 'not-allowed' : 'pointer'}
                            disabled={isDisabled}
                            opacity={isDisabled ? '0.5' : 'opaque'}
                            icon="unlink"
                            color="default"
                            tooltip="Unlink Wallet"
                            onClick={() => onUnlinkClick?.(address)}
                        />
                    )}
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
