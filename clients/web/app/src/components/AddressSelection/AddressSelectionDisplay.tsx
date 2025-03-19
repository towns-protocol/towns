import React from 'react'
import { Address, useUserLookupContext } from 'use-towns-client'
import { constants } from 'ethers'
import { Box, BoxProps, IconButton, Text } from '@ui'
import { Avatar } from '@components/Avatar/Avatar'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { shortAddress } from 'workers/utils'

type Props = {
    address: Address
    onRemove?: (address: Address) => void
} & Pick<BoxProps, 'background'>

export const AddressSelectionDisplay = ({ address, onRemove, ...boxProps }: Props) => {
    const { lookupUser } = useUserLookupContext()
    const user = lookupUser(address)

    const name =
        (user && user.userId === constants.AddressZero) || !user
            ? shortAddress(address)
            : getPrettyDisplayName(user)

    return (
        <Box
            horizontal
            alignItems="center"
            justifyContent="spaceBetween"
            padding="sm"
            background="level3"
            rounded="sm"
            cursor="default"
            data-testid={`address-selection-display-${address}`}
            {...boxProps}
        >
            <Box horizontal alignItems="center" gap="sm">
                <Avatar size="avatar_sm" userId={user && user.userId ? user.userId : address} />
                <Box horizontal alignItems="center">
                    <Box tooltip={address}>
                        <Text>{name}</Text>
                    </Box>
                </Box>
            </Box>
            {onRemove && (
                <IconButton
                    icon="close"
                    size="square_xs"
                    data-testid={`remove-address-${address}`}
                    onClick={() => onRemove(address)}
                />
            )}
        </Box>
    )
}
