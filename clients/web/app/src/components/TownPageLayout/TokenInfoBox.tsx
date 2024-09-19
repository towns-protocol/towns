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
    onInfoBoxClick,
    hasError,
    title,
    subtitle,
    anyoneCanJoin,
    isEntitlementsLoading,
    dataTestId,
}: {
    tokensGatedBy: Token[]
    isEntitlementsLoading?: boolean
    onInfoBoxClick?: () => void
    title: string
    subtitle: string
    hasError?: boolean
    anyoneCanJoin: boolean
    dataTestId?: string
}) => {
    return (
        <InformationBox
            border={hasError ? 'negative' : 'none'}
            title={title}
            subtitle={subtitle}
            dataTestId={dataTestId}
            centerContent={
                anyoneCanJoin ? (
                    <Icon type="people" size="square_md" />
                ) : isEntitlementsLoading ? (
                    <Box>
                        <ButtonSpinner height="x1" />
                    </Box>
                ) : tokensGatedBy && tokensGatedBy.length > 0 ? (
                    <Box position="relative" width="x3" aspectRatio="1/1">
                        {tokensGatedBy.map((token, index) => (
                            <Box
                                key={`${token.data.address}-${token.chainId}-${token.data.tokenId}`}
                                position="absolute"
                                top="none"
                                style={{
                                    zIndex: +vars.zIndex.ui - index || 1,
                                    transform: `translateX(${-(tokensGatedBy.length * 5) / 2}px)`,
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
                ) : null
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
                <Box centerContent gap="sm" padding="sm" background="level3" rounded="sm">
                    <Text size="sm">{tokenDataWithChainId?.data.label}</Text>
                    <NetworkName chainId={chainId} size="xs" color="initial" />
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
