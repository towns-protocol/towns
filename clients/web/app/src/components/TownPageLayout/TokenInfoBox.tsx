import React from 'react'
import { Box, Icon, Text } from '@ui'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { useTokenMetadataForChainId } from 'api/lib/collectionMetadata'
import { vars } from 'ui/styles/vars.css'
import { NetworkName } from '@components/Tokens/TokenSelector/NetworkName'
import { InformationBox } from './InformationBox'

export const TokenInfoBox = ({
    tokensGatingMembership,
    onInfoBoxClick,
    hasError,
    title,
    subtitle,
    anyoneCanJoin,
}: {
    tokensGatingMembership: { address: string; chainId: number }[]
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
                        tokensGatingMembership.length === 0 ? (
                            <Box>
                                <TokenImage imgSrc={undefined} width="x4" />
                            </Box>
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

function SelectedToken({ contractAddress, chainId }: { contractAddress: string; chainId: number }) {
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
            <TokenImage imgSrc={tokenDataWithChainId?.data.imgSrc} width="x3" />
        </Box>
    )
}
