import React from 'react'
import { Link } from 'react-router-dom'
import { Box, Icon, IconButton, Stack, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { TokenImage } from './TokenImage'
import { NetworkName } from './NetworkName'
import { Token } from './tokenSchemas'

type BaseTokenSelectionProps = {
    elevate?: boolean
    token: Token
}

type TokenSelectionInputProps = BaseTokenSelectionProps & {
    onDelete: (option: Token) => void
    onEdit: (option: Token) => void
}

type TokenSelectionDisplayProps = BaseTokenSelectionProps & {
    userPassesEntitlement?: boolean
}

type TokenSelectionProps = TokenSelectionInputProps | TokenSelectionDisplayProps

function TokenSelection(props: TokenSelectionProps) {
    const { elevate = false, token } = props

    return (
        <Stack
            horizontal
            paddingY
            gap="sm"
            elevate={elevate}
            paddingX="sm"
            rounded="sm"
            background="level2"
            alignItems="center"
            width="100%"
            data-testid={`token-pill-selector-pill-${token.data.address}`}
        >
            <TokenImage imgSrc={token.data.imgSrc} width="x5" />
            <Stack horizontal grow gap="sm" alignItems="center" flexWrap="wrap">
                <Stack grow gap="sm">
                    <Stack horizontal gap="sm" alignItems="center">
                        <Text truncate>
                            {token.data.quantity}{' '}
                            {token.data.label?.length ? token.data.label : 'Unknown Token'}{' '}
                        </Text>
                        {'userPassesEntitlement' in props &&
                            props.userPassesEntitlement === false && (
                                <Box
                                    tooltip={
                                        <Box background="level2" padding="sm" rounded="sm">
                                            <Text fontSize="sm">
                                                You do not meet this requirement
                                            </Text>
                                        </Box>
                                    }
                                >
                                    <Icon type="close" color="negative" size="square_xs" />
                                </Box>
                            )}
                    </Stack>
                    <Stack horizontal alignItems="center" gap="sm">
                        <ClipboardCopy clipboardContent={token.data.address}>
                            <Text size="sm">{shortAddress(token.data.address)}</Text>
                        </ClipboardCopy>
                        <Text size="sm" color="gray2">
                            &#x2022;
                        </Text>
                        {token.data.tokenId !== undefined && (
                            <>
                                <Text size="sm" color="gray2">
                                    ID: {token.data.tokenId.toString()}
                                </Text>
                                <Text size="sm" color="gray2">
                                    &#x2022;
                                </Text>
                            </>
                        )}
                        <Stack horizontal gap="xs" alignItems="center">
                            <Box
                                tooltip={
                                    <Box background="level2" padding="sm" rounded="sm">
                                        <Text fontSize="sm">Chain ID: {token.chainId}</Text>
                                    </Box>
                                }
                            >
                                <NetworkName color="gray2" chainId={token.chainId} size="sm" />
                            </Box>
                            {token.data.openSeaCollectionUrl && (
                                <Link
                                    to={token.data.openSeaCollectionUrl}
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
                        onClick={() => props.onEdit(token)}
                    />
                    <IconButton
                        data-testid="token-pill-delete"
                        icon="close"
                        size="square_md"
                        onClick={() => props.onDelete(token)}
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
