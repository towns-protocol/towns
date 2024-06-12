import React from 'react'
import { Box, IconButton, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { TokenDataWithChainId } from '../types'
import { TokenImage } from './TokenImage'
import { NetworkName } from './NetworkName'

export function TokenSelection(
    props: TokenDataWithChainId & {
        onDelete: (option: TokenDataWithChainId) => void
        onEdit: (option: TokenDataWithChainId) => void
    },
) {
    const { onDelete, onEdit } = props
    const { address, imgSrc, label, quantity } = props.data

    return (
        <Box
            horizontal
            padding="sm"
            background="level3"
            rounded="sm"
            alignItems="center"
            justifyContent="spaceBetween"
            data-testid={`token-pill-selector-pill-${address}`}
        >
            <Box horizontal gap="sm">
                <TokenImage imgSrc={imgSrc} width="x4" />
                <Box>
                    <Box
                        display="block"
                        overflow="hidden"
                        whiteSpace="nowrap"
                        style={{
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {label?.length ? label : 'Unknown Token'}
                    </Box>
                    <Box horizontal gap centerContent>
                        {address && (
                            <Box color="gray2" fontSize="sm" tooltip={address}>
                                {shortAddress(address)}
                            </Box>
                        )}
                        <NetworkName fontSize="sm" chainId={props.chainId} />
                    </Box>
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
                </Box>
            </Box>

            <Box horizontal gap="xs" justifySelf="end" alignItems="center">
                <Box
                    horizontal
                    color="gray2"
                    padding="sm"
                    rounded="sm"
                    background="level3"
                    alignItems="center"
                >
                    <Text
                        size={{
                            mobile: 'sm',
                        }}
                    >
                        QTY: {quantity}
                    </Text>
                </Box>
                <IconButton
                    data-testid="token-pill-delete"
                    icon="edit"
                    size="square_xs"
                    onClick={() =>
                        onEdit({
                            chainId: props.chainId,
                            data: props.data,
                        })
                    }
                />
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
            </Box>
        </Box>
    )
}
