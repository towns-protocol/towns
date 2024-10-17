import React from 'react'
import { Link } from 'react-router-dom'
import { constants } from 'ethers'
import { Box, BoxProps, Icon, IconButton, Stack, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { TokenImage } from './TokenImage'
import { NetworkName } from './NetworkName'
import { Token } from './tokenSchemas'

const NATIVE_CHAIN_IDS = [1, 8453, 10, 42161]

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

type TokenSelectionProps = (TokenSelectionInputProps | TokenSelectionDisplayProps) & {
    wrapperBoxProps?: BoxProps
}

export function TokenSelection(props: TokenSelectionProps) {
    const { elevate = false, token, wrapperBoxProps } = props

    return (
        <Stack
            horizontal
            hoverable={wrapperBoxProps?.hoverable}
            paddingY={wrapperBoxProps?.paddingY ?? 'md'}
            gap="sm"
            elevate={elevate}
            paddingX={wrapperBoxProps?.paddingX ?? 'sm'}
            rounded={wrapperBoxProps?.rounded ?? 'sm'}
            background={wrapperBoxProps?.background ?? 'level2'}
            alignItems="center"
            width="100%"
            data-testid={`token-pill-selector-pill-${token.data.address}`}
        >
            <TokenImage imgSrc={token.data.imgSrc} width="x5" />
            <Stack horizontal grow gap="sm" alignItems="center" flexWrap="wrap">
                <Stack grow gap="sm">
                    <Stack horizontal gap="sm" alignItems="center">
                        <Text truncate>
                            {token.data.quantity !== '0' ? token.data.quantity : ''}{' '}
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
                        {token.data.address !== constants.AddressZero && (
                            <>
                                <ClipboardCopy clipboardContent={token.data.address}>
                                    <Text size="sm">{shortAddress(token.data.address)}</Text>
                                </ClipboardCopy>
                                <Text size="sm" color="gray2">
                                    &#x2022;
                                </Text>
                            </>
                        )}
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
                            {token.data.address === constants.AddressZero ? (
                                NATIVE_CHAIN_IDS.map((chainId) => (
                                    <Box
                                        key={chainId}
                                        tooltip={
                                            <Box background="level2" padding="sm" rounded="sm">
                                                <Text fontSize="sm">Chain ID: {chainId}</Text>
                                            </Box>
                                        }
                                    >
                                        <Box horizontal color="gray2">
                                            <NetworkName
                                                color="gray2"
                                                chainId={chainId}
                                                size="sm"
                                            />
                                            {chainId !==
                                                NATIVE_CHAIN_IDS[NATIVE_CHAIN_IDS.length - 1] && (
                                                <Text size="sm" color="gray2">
                                                    ,
                                                </Text>
                                            )}
                                        </Box>
                                    </Box>
                                ))
                            ) : (
                                <Box
                                    tooltip={
                                        <Box background="level2" padding="sm" rounded="sm">
                                            <Text fontSize="sm">Chain ID: {token.chainId}</Text>
                                        </Box>
                                    }
                                >
                                    <NetworkName color="gray2" chainId={token.chainId} size="sm" />
                                </Box>
                            )}
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
