import React from 'react'
import { BigNumber } from 'ethers'
import { Link } from 'react-router-dom'
import { Icon, Stack, Text, Tooltip } from '@ui'
import { FetchedTokenAvatar } from '@components/Tokens/FetchedTokenAvatar'
import { shortAddress } from 'ui/utils/utils'
import { ArrayElement } from 'types'
import { baseScanUrl, openSeaBaseAssetUrl } from '../utils'
import { useWatchLinkedWalletsForToken } from './tokenStatus'
import { TokenGatingMembership } from './TokenGatingMembership'

// TODO ruleDatas
export function TokenBox({
    token,
    tokensLength,
    chainId,
}: {
    token: ArrayElement<TokenGatingMembership['tokens']>
    tokensLength: number
    chainId: number
}) {
    const tokenAddress = token.contractAddress
    const { data } = useWatchLinkedWalletsForToken({ chainId, token })

    const tokenStatus = data?.status

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
                border={!tokenStatus || tokenStatus === 'failure' ? 'negative' : 'positive'}
            >
                <Stack position="absolute" top="sm" left="sm">
                    <Icon
                        color={tokenStatus === 'success' ? 'positive' : 'negative'}
                        type={tokenStatus === 'success' ? 'check' : 'close'}
                        size="square_xs"
                    />
                </Stack>
                <FetchedTokenAvatar
                    showUnknownLabel
                    address={tokenAddress}
                    tokenIds={token.tokenIds.map((t) => (t as BigNumber).toNumber())}
                    layoutProps={{
                        rounded: 'sm',
                    }}
                    labelProps={{
                        whiteSpace: 'nowrap',
                    }}
                    avatarToggleClasses={{
                        circle: false,
                    }}
                    size="avatar_lg"
                />
                <Stack horizontal centerContent gap="sm">
                    <Link
                        to={`${baseScanUrl(chainId)}/address/${tokenAddress}`}
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
                                    <Text size="sm">{tokenAddress}</Text>
                                </Tooltip>
                            }
                        >
                            <Text>{shortAddress(tokenAddress)}</Text>
                            <Icon type="linkOut" />
                        </Stack>
                    </Link>
                    {tokensLength > 1 && tokenStatus === 'failure' && (
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
                                <Icon type="openSea" size="square_sm" />
                            </Stack>
                        </Link>
                    )}
                </Stack>
            </Stack>
        </Stack>
    )
}
