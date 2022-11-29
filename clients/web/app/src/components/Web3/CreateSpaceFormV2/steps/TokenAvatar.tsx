import React from 'react'
import { Avatar, Box, IconButton, Text } from '@ui'

export type TokenProps = {
    imgSrc: string
    label: string
    contractAddress: string
    onClick?: (contractAddress: string) => void
}

export const TokenAvatar = (props: Partial<TokenProps>) => {
    const { imgSrc, label, contractAddress, onClick } = props
    return (
        <Box alignItems="center" maxWidth="x6" data-testid="token-avatar">
            <Box position="relative">
                <Avatar src={imgSrc} size="avatar_md" />
                {onClick && contractAddress && (
                    <IconButton
                        style={{
                            top: '-10%',
                            right: '-10%',
                        }}
                        insetTop="xxs"
                        rounded="full"
                        translate="yes"
                        size="square_xxs"
                        position="absolute"
                        icon="close"
                        background="level4"
                        color="default"
                        onClick={() => onClick(contractAddress)}
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
