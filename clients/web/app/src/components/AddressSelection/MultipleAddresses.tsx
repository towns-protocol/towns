import React, { useCallback } from 'react'
import { Address } from 'use-towns-client'
import { Box, Card, Icon, IconButton, Text } from '@ui'

type Props = {
    walletMembers: Address[]
    selectedAddresses: Address[]
    removeAll: () => void
}

export const MultipleAddresses = ({ walletMembers, selectedAddresses, removeAll }: Props) => {
    const handleDownloadCSV = useCallback(() => {
        const csvContent = walletMembers.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', 'wallet_addresses.csv')
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }, [walletMembers])

    if (walletMembers.length === 0) {
        return null
    }

    return (
        <Card
            horizontal
            alignItems="center"
            justifyContent="spaceBetween"
            padding="sm"
            background="level1"
            rounded="sm"
            cursor="default"
        >
            <Box horizontal alignItems="center" gap="sm">
                <Icon type="wallet" size="square_sm" />
                <Box horizontal alignItems="center">
                    <Box>
                        <Text>
                            {selectedAddresses.length > 0 && '+'}
                            {walletMembers.length - selectedAddresses.length} addresses
                        </Text>
                    </Box>
                </Box>
            </Box>
            <Box horizontal alignItems="center" gap="sm">
                <IconButton
                    icon="download"
                    size="square_xs"
                    tooltip="Download all"
                    onClick={handleDownloadCSV}
                />
                <IconButton
                    icon="close"
                    size="square_xs"
                    tooltip="Remove all"
                    onClick={removeAll}
                />
            </Box>
        </Card>
    )
}
