import React from 'react'
import { Box, BoxProps, Icon, Text } from '@ui'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { useTokenMetadataForChainId } from 'api/lib/collectionMetadata'
import { vars } from 'ui/styles/vars.css'
import { NetworkName } from '@components/Tokens/TokenSelector/NetworkName'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { InformationBox } from './InformationBox'

export const TokenInfoBox = ({
    tokensGatingMembership,
    onInfoBoxClick,
    hasError,
    title,
    subtitle,
    anyoneCanJoin,
    isTokensGatingMembershipLoading,
}: {
    tokensGatingMembership: { address: string; chainId: number }[] | undefined
    isTokensGatingMembershipLoading?: boolean
    onInfoBoxClick?: () => void
    title: string
    subtitle: string
    hasError?: boolean
    anyoneCanJoin: boolean
}) => {
    return (
        <InformationBox
            // key="c"
            border={hasError ? 'negative' : 'none'}
            title={title}
            centerContent={
                <>
                    {!anyoneCanJoin ? (
                        isTokensGatingMembershipLoading ? (
                            <Box>
                                <ButtonSpinner height="x1" />
                            </Box>
                        ) : !tokensGatingMembership ? (
                            <></>
                        ) : (
                            <Box position="relative" width="x3" aspectRatio="1/1">
                                {tokensGatingMembership.map((token, index) => (
                                    <Box
                                        key={token.address + token.chainId}
                                        position="absolute"
                                        top="none"
                                        style={{
                                            zIndex: +vars.zIndex.ui - index || 1,
                                            transform: `translateX(${
                                                -(tokensGatingMembership.length * 5) / 2
                                            }px)`,
                                            left: index ? `${index * 10}px` : 0,
                                        }}
                                    >
                                        <SelectedToken
                                            contractAddress={token.address}
                                            chainId={token.chainId}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        )
                    ) : (
                        <Icon type="people" size="square_md" />
                    )}
                </>
            }
            subtitle={subtitle}
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
    const { data: tokenDataWithChainId, error } = useTokenMetadataForChainId(
        contractAddress,
        chainId,
    )
    console.log('tokenDataWithChainId', tokenDataWithChainId, error)
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
