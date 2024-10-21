import React from 'react'
import { Address } from 'use-towns-client'
import { Box, BoxProps, Icon, Text } from '@ui'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { useTokenMetadataForChainId } from 'api/lib/collectionMetadata'
import { vars } from 'ui/styles/vars.css'
import { NetworkName } from '@components/Tokens/TokenSelector/NetworkName'
import { Token } from '@components/Tokens/TokenSelector/tokenSchemas'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { InformationBox } from './InformationBox'

export const TokenInfoBox = ({
    tokensGatedBy,
    usersGatedBy,
    onInfoBoxClick,
    hasError,
    title,
    subtitle,
    isEntitlementsLoading,
    dataTestId,
}: {
    tokensGatedBy: Token[]
    usersGatedBy: string[]
    isEntitlementsLoading?: boolean
    onInfoBoxClick?: () => void
    title: string
    subtitle: string
    hasError?: boolean
    dataTestId?: string
}) => {
    return (
        <InformationBox
            border={hasError ? 'negative' : 'none'}
            title={title}
            subtitle={subtitle}
            dataTestId={dataTestId}
            centerContent={
                isEntitlementsLoading ? (
                    <Box>
                        <ButtonSpinner height="x1" />
                    </Box>
                ) : (tokensGatedBy && tokensGatedBy.length > 0) ||
                  (usersGatedBy && usersGatedBy.length > 0) ? (
                    <Box horizontal gap="xs" alignItems="center">
                        {usersGatedBy && usersGatedBy.length > 0 ? (
                            <Box tooltip="Specific wallet addresses">
                                <Icon type="wallet" size="square_md" />
                            </Box>
                        ) : null}
                        {tokensGatedBy && tokensGatedBy.length > 0 ? (
                            <Box position="relative" width="x3" aspectRatio="1/1">
                                {tokensGatedBy.map((token, index) => (
                                    <Box
                                        key={`${token.data.address}-${token.chainId}-${token.data.tokenId}`}
                                        position="absolute"
                                        top="none"
                                        style={{
                                            zIndex: +vars.zIndex.ui - index || 1,
                                            transform: `translateX(${
                                                -(tokensGatedBy.length * 5) / 2
                                            }px)`,
                                            left: index ? `${index * 10}px` : 0,
                                        }}
                                    >
                                        <SelectedToken
                                            contractAddress={token.data.address as Address}
                                            chainId={token.chainId}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        ) : null}
                    </Box>
                ) : (
                    <Icon type="people" size="square_md" />
                )
            }
            onClick={onInfoBoxClick}
        />
    )
}

export function SelectedToken({
    contractAddress,
    chainId,
    size = 'x3',
    ...boxProps
}: {
    contractAddress: string
    chainId: number
    size?: BoxProps['width']
} & Omit<BoxProps, 'size'>) {
    const { data: tokenDataWithChainId } = useTokenMetadataForChainId(contractAddress, chainId)

    return (
        <Box
            tooltip={
                <Box centerContent gap="sm" padding="sm" background="level2" rounded="sm">
                    <Box horizontal gap="xs" alignItems="center">
                        <Text size="sm">{tokenDataWithChainId?.data.label}</Text>
                        <Text size="sm">·</Text>
                        <NetworkName chainId={chainId} size="sm" color="initial" />
                    </Box>
                    <Text size="xs">{tokenDataWithChainId?.data.address}</Text>
                </Box>
            }
        >
            {tokenDataWithChainId ? (
                <TokenImage imgSrc={tokenDataWithChainId.data?.imgSrc} width={size} />
            ) : (
                <Box
                    centerContent
                    aspectRatio="1/1"
                    background="level4"
                    borderRadius="sm"
                    width={size}
                    {...boxProps}
                />
            )}
        </Box>
    )
}
