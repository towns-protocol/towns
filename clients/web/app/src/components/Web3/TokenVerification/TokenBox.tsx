import React from 'react'
import { Link } from 'react-router-dom'
import { Icon, Stack, Text, Tooltip } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { ArrayElement } from 'types'
import { TokenGatingMembership } from 'hooks/useTokensGatingMembership'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { useTokenMetadataForChainId } from 'api/lib/collectionMetadata'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { openSeaBaseAssetUrl } from '../utils'
import { useWatchLinkedWalletsForToken } from './tokenStatus'

export function TokenBox({
    token,
    tokensLength,
    chainId,
}: {
    token: ArrayElement<TokenGatingMembership['tokens']>
    tokensLength: number
    chainId: number
}) {
    const tokenAddress = token.address
    const { data, isLoading } = useWatchLinkedWalletsForToken({ chainId, token })
    const { data: tokenDataWithChainId } = useTokenMetadataForChainId(tokenAddress, chainId)

    const tokenStatus = data?.status
    const borderColor = isLoading
        ? 'none'
        : !tokenStatus || tokenStatus === 'failure'
        ? 'negative'
        : 'positive'

    return (
        <Stack centerContent gap key={tokenAddress}>
            <Stack
                centerContent
                gap="sm"
                rounded="md"
                height="x18"
                width="x20"
                background="level3"
                position="relative"
                border={borderColor}
            >
                {isLoading ? (
                    <ButtonSpinner />
                ) : (
                    <>
                        <Stack position="absolute" top="sm" left="sm">
                            <Icon
                                color={tokenStatus === 'success' ? 'positive' : 'negative'}
                                type={tokenStatus === 'success' ? 'check' : 'close'}
                                size="square_xs"
                            />
                        </Stack>
                        <TokenImage imgSrc={tokenDataWithChainId?.data.imgSrc} width="x8" />
                        <Text>{tokenDataWithChainId?.data.label}</Text>
                        <Stack horizontal centerContent gap="sm">
                            <Link
                                to={`${openSeaBaseAssetUrl}/${tokenAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Stack
                                    horizontal
                                    centerContent
                                    gap="xs"
                                    color="gray2"
                                    tooltip={
                                        <Tooltip>
                                            <Text size="sm">Purchase on OpenSea</Text>
                                        </Tooltip>
                                    }
                                >
                                    <Text>{shortAddress(tokenAddress)}</Text>
                                    <Icon type="openSea" size="square_sm" />
                                </Stack>
                            </Link>
                        </Stack>
                    </>
                )}
            </Stack>
        </Stack>
    )
}
