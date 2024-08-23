import React from 'react'
import { Link } from 'react-router-dom'
import { Box, Icon, IconButton, Stack, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { TokenDataWithChainId } from '../types'
import { TokenImage } from './TokenImage'
import { NetworkName } from './NetworkName'

type BaseTokenSelectionProps = TokenDataWithChainId & {
    elevate?: boolean
}

type TokenSelectionInputProps = BaseTokenSelectionProps & {
    onDelete: (option: TokenDataWithChainId) => void
    onEdit: (option: TokenDataWithChainId) => void
}

type TokenSelectionDisplayProps = BaseTokenSelectionProps & {
    userOwnsToken?: boolean
}

type TokenSelectionProps = TokenSelectionInputProps | TokenSelectionDisplayProps

function TokenSelection(props: TokenSelectionProps) {
    const { elevate = false } = props
    const { address, imgSrc, label, quantity, openSeaCollectionUrl } = props.data

    return (
        <Stack
            horizontal
            paddingY
            gap="sm"
            elevate={elevate}
            paddingX="sm"
            rounded="sm"
            background="level3"
            alignItems="center"
            width="100%"
            data-testid={`token-pill-selector-pill-${address}`}
        >
            <TokenImage imgSrc={imgSrc} width="x5" />
            <Stack horizontal grow gap="sm" alignItems="center" flexWrap="wrap">
                <Stack grow gap="sm">
                    <Stack horizontal gap="sm" alignItems="center">
                        <Text truncate>
                            {quantity !== undefined ? `${quantity} ` : ''}
                            {label?.length ? label : 'Unknown Token'}
                        </Text>
                        {'userOwnsToken' in props && (
                            <Box
                                tooltip={
                                    <Box background="level2" padding="sm" rounded="sm">
                                        <Text fontSize="sm">
                                            {props.userOwnsToken
                                                ? 'You own this token'
                                                : 'You do not own this token'}
                                        </Text>
                                    </Box>
                                }
                            >
                                {props.userOwnsToken !== undefined && (
                                    <Icon
                                        type={props.userOwnsToken ? 'check' : 'close'}
                                        color={props.userOwnsToken ? 'positive' : 'negative'}
                                        size="square_xs"
                                    />
                                )}
                            </Box>
                        )}
                    </Stack>
                    <Stack horizontal alignItems="center" gap="sm">
                        <ClipboardCopy clipboardContent={address}>
                            <Text size="sm">{shortAddress(address)}</Text>
                        </ClipboardCopy>
                        <Text size="sm" color="gray2">
                            &#x2022;
                        </Text>
                        <Stack horizontal gap="xs" alignItems="center">
                            <Box
                                tooltip={
                                    <Box background="level2" padding="sm" rounded="sm">
                                        <Text fontSize="sm">Chain ID: {props.chainId}</Text>
                                    </Box>
                                }
                            >
                                <NetworkName color="gray2" chainId={props.chainId} size="sm" />
                            </Box>
                            {openSeaCollectionUrl && (
                                <Link
                                    to={openSeaCollectionUrl}
                                    rel="noopener noreffer"
                                    target="_blank"
                                >
                                    <Icon type="openSeaPlain" color="gray2" size="square_xs" />
                                </Link>
                            )}
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>
            {'onEdit' in props && 'onDelete' in props && (
                <Stack horizontal gap="xxs">
                    <IconButton
                        data-testid="token-pill-edit"
                        icon="edit"
                        size="square_md"
                        onClick={() => props.onEdit({ chainId: props.chainId, data: props.data })}
                    />
                    <IconButton
                        data-testid="token-pill-delete"
                        icon="close"
                        size="square_md"
                        onClick={() => props.onDelete({ chainId: props.chainId, data: props.data })}
                    />
                </Stack>
            )}
        </Stack>
    )
}

export const TokenSelectionInput = (props: TokenSelectionInputProps) => (
    <TokenSelection {...props} />
)
export const TokenSelectionDisplay = (props: TokenSelectionDisplayProps) => (
    <TokenSelection {...props} />
)
