import React from 'react'
import { Box, IconButton, Paragraph } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { TokenDataWithChainId } from '../types'
import { TokenImage } from './TokenImage'

export function TokenPill(
    props: TokenDataWithChainId & { onDelete: (option: TokenDataWithChainId) => void },
) {
    const { onDelete } = props
    const { address, imgSrc, label } = props.data

    return (
        <Box
            horizontal
            gap="sm"
            paddingX="sm"
            paddingY="xs"
            background="level3"
            rounded="md"
            alignItems="center"
            data-testid={`token-pill-selector-pill-${address}`}
        >
            <TokenImage imgSrc={imgSrc} width="x3" />
            <>
                <Box maxWidth="x12">
                    <Paragraph truncate>{label ?? 'Unknown NFT'}</Paragraph>
                </Box>
                {address && (
                    <Box color="gray2" tooltip={address}>
                        {shortAddress(address)}
                    </Box>
                )}
                {/* TODO: handle ERC1155 */}
                {/* <Box horizontal gap="xs">
                    {tokenIds.map((id) => (
                        <Box
                            centerContent
                            rounded="full"
                            key={id}
                            padding="xs"
                            height="x2"
                            width="x2"
                            background="level1"
                        >
                            <Text size="xs">{id}</Text>
                        </Box>
                    ))}
                </Box> */}
                <IconButton
                    data-testid="token-pill-delete"
                    icon="close"
                    size="square_xs"
                    onClick={() =>
                        onDelete({
                            chainId: props.chainId,
                            data: props.data,
                        })
                    }
                />
            </>
        </Box>
    )
}
