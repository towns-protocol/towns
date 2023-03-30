import React from 'react'
import { Avatar, Box, IconButton, Text } from '@ui'
import { AvatarProps } from 'ui/components/Avatar/Avatar'
import { useGetPioneerNftAddress } from 'hooks/useGetPioneerNftAddress'
import { TokenProps } from './types'

export const TokenAvatar = (
    props: Partial<TokenProps> & { contractAddress: string; size: AvatarProps['size'] },
) => {
    const { imgSrc, label, contractAddress, onClick, size } = props
    const pioneerAddress = useGetPioneerNftAddress()

    const image =
        contractAddress.toLowerCase() === pioneerAddress?.toLowerCase()
            ? `/placeholders/pioneer_thumb300.avif`
            : imgSrc

    return (
        <Box alignItems="center" maxWidth="x6" data-testid="token-avatar">
            <Box position="relative" border={!image ? 'level4' : 'none'} rounded="full">
                {contractAddress && <Avatar key={contractAddress} src={image} size={size} />}
                {onClick && contractAddress && (
                    <IconButton
                        style={{
                            top: '-10%',
                            right: '-10%',
                        }}
                        top="none"
                        right="none"
                        rounded="full"
                        translate="yes"
                        size="square_xxs"
                        position="absolute"
                        icon="close"
                        background="level4"
                        color="default"
                        onClick={(e) => onClick(contractAddress, e)}
                    />
                )}
            </Box>
            {label && (
                <Box paddingTop="sm">
                    <Text size="sm" color="default" textAlign="center">
                        {label}
                    </Text>
                </Box>
            )}
        </Box>
    )
}
