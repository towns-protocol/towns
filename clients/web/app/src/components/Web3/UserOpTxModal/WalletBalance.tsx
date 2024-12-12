import React from 'react'
import { Box, Icon, Text } from '@ui'
import { shortAddress } from 'workers/utils'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { RecipientText } from './RecipientText'

export function WalletBalance({
    toAddress,
    isLoadingBalance,
    smartAccountAddress,
    formattedBalance,
    balanceIsLessThanCost,
}: {
    toAddress?: string
    isLoadingBalance: boolean
    smartAccountAddress?: string
    formattedBalance?: string
    balanceIsLessThanCost: boolean
}) {
    return (
        <Box
            padding
            color="default"
            background="level3"
            rounded="sm"
            width="100%"
            gap="md"
            border={balanceIsLessThanCost ? 'negative' : 'none'}
        >
            {toAddress && (
                <Box borderBottom="level4" paddingBottom="sm">
                    <RecipientText sendingTo={toAddress} />
                </Box>
            )}

            <Box horizontal justifyContent="spaceBetween" alignItems="center">
                <Box horizontal gap="sm">
                    <Box position="relative" width="x3">
                        <Icon position="absoluteCenter" type="wallet" />{' '}
                    </Box>
                    <Text>
                        {isLoadingBalance
                            ? 'Fetching balance...'
                            : smartAccountAddress
                            ? shortAddress(smartAccountAddress)
                            : ''}
                    </Text>
                </Box>
                {formattedBalance ? (
                    <Text size={balanceIsLessThanCost ? 'sm' : 'md'}>
                        {formattedBalance} Available
                    </Text>
                ) : (
                    <ButtonSpinner />
                )}
            </Box>
        </Box>
    )
}
