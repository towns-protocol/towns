import React from 'react'
import { Address, useGetRootKeyFromLinkedWallet, useUserLookupContext } from 'use-towns-client'
import { constants } from 'ethers'
import { Box, Card, IconButton, Text } from '@ui'
import { Avatar } from '@components/Avatar/Avatar'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { shortAddress } from 'workers/utils'

type Props = {
    address: Address
    onRemove: (address: Address) => void
}

export const AddressSelectionDisplay = ({ address, onRemove }: Props) => {
    const { lookupUser } = useUserLookupContext()
    const { data: rootKey } = useGetRootKeyFromLinkedWallet({ walletAddress: address })
    const user = lookupUser(rootKey || address)

    const name =
        (user && user.userId === constants.AddressZero) || !user
            ? shortAddress(address)
            : getPrettyDisplayName(user)

    return (
        <Card
            horizontal
            alignItems="center"
            justifyContent="spaceBetween"
            padding="sm"
            background="level1"
            rounded="sm"
            cursor="default"
            data-testid={`address-selection-display-${address}`}
        >
            <Box horizontal alignItems="center" gap="sm">
                <Avatar size="avatar_sm" userId={address} />
                <Box horizontal alignItems="center">
                    <Box tooltip={address}>
                        <Text>{name}</Text>
                    </Box>
                    <ClipboardCopy clipboardContent={address} />
                </Box>
            </Box>
            <IconButton
                icon="close"
                size="square_xs"
                data-testid={`remove-address-${address}`}
                onClick={() => onRemove(address)}
            />
        </Card>
    )
}
