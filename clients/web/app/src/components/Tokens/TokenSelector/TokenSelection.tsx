import React from 'react'
import { Link } from 'react-router-dom'
import { constants } from 'ethers'
import { Box, BoxProps, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { TokenImage } from './TokenImage'
import { NetworkName, getNetworkName } from './NetworkName'
import { Token } from './tokenSchemas'

const NATIVE_CHAIN_IDS = [1, 8453, 10, 42161]

type BaseTokenSelectionProps = {
    elevate?: boolean
    token: Token
    optionBoxProps?: BoxProps
}

type TokenSelectionInputProps = BaseTokenSelectionProps & {
    onDelete: (option: Token) => void
    onEdit: (option: Token) => void
}

type TokenSelectionDisplayProps = BaseTokenSelectionProps & {
    userPassesEntitlement?: boolean
}

type TokenSelectionProps = TokenSelectionInputProps | TokenSelectionDisplayProps

export function TokenSelection(props: TokenSelectionProps) {
    const { elevate = false, token, optionBoxProps: wrapperBoxProps } = props

    const tokenNameAndQuantity = `${token.data.quantity !== '0' ? token.data.quantity : ''} ${
        token.data.label?.length ? token.data.label : 'Unknown Token'
    }`

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
            data-testid={`token-pill-selector-pill-${token.data.address}`}
        >
            <Box centerContent>
                <TokenImage imgSrc={token.data.imgSrc} width="x5" background="inherit" />
            </Box>

            {/* center content */}
            <Stack
                grow
                gap="sm"
                flexWrap="wrap"
                justifyContent="center"
                overflow="hidden"
                paddingY="xs"
                insetY="xxs"
            >
                {/* token name and quantity */}
                <Box horizontal gap="sm" width="100%" tooltip={tokenNameAndQuantity}>
                    <Paragraph truncate width="100%">
                        {tokenNameAndQuantity}
                    </Paragraph>
                    {'userPassesEntitlement' in props && props.userPassesEntitlement === false && (
                        <Box
                            tooltip={
                                <Box background="level2" padding="sm" rounded="sm">
                                    <Text fontSize="sm">You do not meet this requirement</Text>
                                </Box>
                            }
                        >
                            <Icon type="close" color="negative" size="square_xs" />
                        </Box>
                    )}{' '}
                </Box>

                {/* token address and token id */}
                <Stack horizontal gap="sm" alignItems="end">
                    {token.data.address !== constants.AddressZero && (
                        <Box horizontal gap="sm" height="paragraph" alignItems="center">
                            <ClipboardCopy clipboardContent={token.data.address} fontSize="sm">
                                {shortAddress(token.data.address)}
                            </ClipboardCopy>
                            <Text size="sm" color="gray2">
                                &#x2022;
                            </Text>
                        </Box>
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

                    {token.data.address === constants.AddressZero ? (
                        <Text size="sm" color="gray2" fontSize="sm">
                            {NATIVE_CHAIN_IDS.map((chainId) => (
                                <Box
                                    as="span"
                                    display="inline-block"
                                    key={chainId}
                                    tooltip={
                                        <Box background="level2" padding="sm" rounded="sm">
                                            <Text fontSize="sm">Chain ID: {chainId}</Text>
                                        </Box>
                                    }
                                >
                                    {getNetworkName(chainId)}
                                    {chainId !== NATIVE_CHAIN_IDS[NATIVE_CHAIN_IDS.length - 1] && (
                                        <>,&nbsp;</>
                                    )}
                                </Box>
                            ))}
                        </Text>
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
                        <Box position="relative" height="x1" width="paragraph">
                            <Link
                                to={token.data.openSeaCollectionUrl}
                                rel="noopener noreffer"
                                target="_blank"
                            >
                                <Box position="absoluteCenter">
                                    <Icon type="openSeaPlain" color="gray2" size="square_xs" />
                                </Box>
                            </Link>
                        </Box>
                    )}
                </Stack>
            </Stack>
            {'onEdit' in props && 'onDelete' in props && (
                <Stack horizontal centerContent shrink={false} insetX="xxs">
                    <IconButton
                        hoverable
                        data-testid="token-pill-edit"
                        icon="edit"
                        size="square_sm"
                        onClick={() => props.onEdit(token)}
                    />
                    <IconButton
                        hoverable
                        data-testid="token-pill-delete"
                        icon="close"
                        size="square_sm"
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
