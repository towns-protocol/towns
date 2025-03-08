import React, { useCallback, useMemo, useState } from 'react'
import { formatUnits } from 'viem'
import { useMyUserId, useUserLookupContext } from 'use-towns-client'
import { Box, Icon, IconButton, Pill, Stack, Text } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { formatCompactNumber } from '@components/Web3/Trading/tradingUtils'
import { TokenPrice } from '@components/Web3/Trading/ui/TokenPrice'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { TokenIcon } from '@components/Web3/Trading/ui/TokenIcon'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Avatar } from '@components/Avatar/Avatar'
import { GetCoinDataResponse } from './useCoinData'
import { TickerChangeIndicator } from './TickerChangeIndicator'

export const TickerInfoBox = (props: {
    minimal: boolean
    coinData: GetCoinDataResponse | undefined
    address: string
    chainId: string
    balance: bigint
    tradingUserIds: string[]
}) => {
    const { minimal, coinData, address, chainId, balance, tradingUserIds } = props
    const [isExpanded, setIsExpanded] = useState(false)
    const onToggleExpanded = useCallback(() => {
        setIsExpanded((e) => !e)
    }, [])
    return coinData ? (
        <>
            <TickerHeader
                expandable
                minimal={minimal}
                expanded={isExpanded}
                coinData={coinData}
                address={address}
                chainId={chainId}
                onToggleExpanded={onToggleExpanded}
            />
            {(!minimal || isExpanded) && (
                <TickerPills
                    coinData={coinData}
                    balance={balance}
                    tradingUserIds={tradingUserIds}
                />
            )}
        </>
    ) : (
        <>
            <Stack horizontal alignItems="center">
                <Stack horizontal gap="sm" alignItems="center">
                    <Box width="x2.5" height="x2.5" rounded="full" className={shimmerClass} />
                </Stack>
                <Box grow />
                <Box>
                    <Box height="x2" className={shimmerClass} width="x12" rounded="md" />
                </Box>
            </Stack>

            <Box height="x2" className={shimmerClass} width="x12" rounded="md" />

            <Stack horizontal grow gap="sm">
                <Box height="x2" className={shimmerClass} width="x12" rounded="md" />
            </Stack>
            <Stack horizontal grow gap="sm" color="gray1">
                <Box height="x2" className={shimmerClass} rounded="md" width="x6" />
                <Box height="x2" className={shimmerClass} rounded="md" width="x6" />
                <Box height="x2" className={shimmerClass} rounded="md" width="x6" />
                <Box height="x2" className={shimmerClass} rounded="md" width="x6" />
            </Stack>
        </>
    )
}

export const TickerHeader = (
    props: { coinData: GetCoinDataResponse; address: string; chainId: string } & {
        minimal?: boolean
        expandable?: boolean
        expanded?: boolean
        onToggleExpanded?: () => void
    },
) => {
    const { minimal, expanded, coinData, address, chainId, onToggleExpanded, expandable } = props
    return (
        <Stack horizontal={minimal} gap="paragraph">
            <Stack horizontal gap="sm" alignItems="center" insetY="xxs">
                <TokenIcon
                    asset={{
                        imageUrl: coinData.token.info.imageThumbUrl ?? '',
                        chain: chainId,
                    }}
                />
                <Box maxWidth="200" overflow="hidden" paddingY="xs" gap="sm">
                    <Stack horizontal gap="sm" alignItems="end">
                        <Text
                            truncate
                            color="gray2"
                            maxWidth="150"
                            fontSize="sm"
                            fontWeight="strong"
                            textTransform="uppercase"
                        >
                            {coinData.token.symbol}
                        </Text>
                        <ClipboardCopy
                            maxWidth="100"
                            color="gray2"
                            fontSize="sm"
                            gap="none"
                            clipboardContent={address}
                            label={address}
                        />
                    </Stack>
                    <Text truncate maxWidth="250" fontSize="lg" fontWeight="strong">
                        {coinData.token.name}
                    </Text>
                </Box>
            </Stack>
            <Stack horizontal grow gap="sm">
                <Stack grow horizontal={!minimal} gap="sm" alignItems="end">
                    <TokenPrice fontWeight="strong" fontSize="lg" before="$">
                        {coinData.priceUSD}
                    </TokenPrice>
                    <Stack horizontal gap="sm" alignItems="end">
                        <TickerChangeIndicator change={Number(coinData.change24)} />
                        {!minimal && (
                            <Text color="gray2" size="sm">
                                Past day
                            </Text>
                        )}
                    </Stack>
                </Stack>
                {minimal && expandable && (
                    <Stack centerContent>
                        <IconButton
                            style={{
                                transform: !expanded ? 'none' : 'rotate(180deg)',
                            }}
                            icon="arrowDown"
                            color="default"
                            onClick={onToggleExpanded}
                        />
                    </Stack>
                )}
            </Stack>
        </Stack>
    )
}

const TickerPills = ({
    coinData,
    balance,
    tradingUserIds,
}: {
    coinData: GetCoinDataResponse
    balance: bigint
    tradingUserIds: string[]
}) => {
    return (
        <Stack gap="sm">
            {(balance > 0n && coinData) || tradingUserIds.length > 0 ? (
                <Stack grow horizontal gap="sm" color="gray2" flexWrap="wrap">
                    {balance > 0n && coinData && (
                        <Pill background="lightHover" whiteSpace="nowrap">
                            <Stack horizontal gap="xs" alignItems="center">
                                <Icon type="wallet" size="square_xs" color="gray2" />
                                <Text fontSize="sm" color="gray1">
                                    {formatCompactNumber(
                                        Number(formatUnits(balance, coinData.token.decimals)),
                                    )}
                                </Text>
                            </Stack>
                        </Pill>
                    )}
                    {tradingUserIds.length > 0 && (
                        <Pill background="lightHover" color="inherit" whiteSpace="nowrap">
                            <TradingUserIds userIds={tradingUserIds} />
                        </Pill>
                    )}
                </Stack>
            ) : (
                <></>
            )}
            <Stack grow horizontal gap="sm" color="gray2" flexWrap="wrap">
                {/* 
                            `codexResponse.marketCap` is actually not the market cap, but the FDV.
                            This is a bit confusing, but it's how the API is.
                            Market cap is `codexResponse.token.info.circulatingSupply * codexResponse.priceUSD`
                            (&#8201; is "thin space")
                            */}
                <Pill background="lightHover" color="inherit" whiteSpace="nowrap">
                    <Text fontSize="sm">
                        LIQ&#8201;$
                        {formatCompactNumber(Number(coinData.liquidity))}
                    </Text>
                </Pill>
                <Pill background="lightHover" color="inherit" whiteSpace="nowrap">
                    <Text fontSize="sm">
                        VOL&#8201;$
                        {formatCompactNumber(Number(coinData.volume24))}
                    </Text>
                </Pill>
                <Pill background="lightHover" color="inherit" whiteSpace="nowrap">
                    <Text fontSize="sm">
                        MCAP&#8201; $
                        {formatCompactNumber(
                            Number(coinData.token.info.circulatingSupply) *
                                Number(coinData.priceUSD),
                        )}
                    </Text>
                </Pill>
                <Pill background="lightHover" color="inherit" whiteSpace="nowrap">
                    <Text fontSize="sm">HDLRS&#8201;{formatCompactNumber(coinData.holders)}</Text>
                </Pill>
                <Pill background="lightHover" color="inherit" whiteSpace="nowrap">
                    <Text fontSize="sm">
                        FDV&#8201;$
                        {formatCompactNumber(Number(coinData.marketCap))}
                    </Text>
                </Pill>
            </Stack>
        </Stack>
    )
}

const TradingUserIds = ({ userIds }: { userIds: string[] }) => {
    const { lookupUser } = useUserLookupContext()
    const myUserId = useMyUserId()

    const summaryText = useMemo(() => {
        if (userIds.length === 0) {
            return ''
        }
        const getPrettyDisplayNameOrYou = (userId: string) => {
            if (userId === myUserId) {
                return 'you'
            }
            return getPrettyDisplayName(lookupUser(userId))
        }
        if (userIds.length === 1) {
            return getPrettyDisplayNameOrYou(userIds[0]) + ' traded'
        }
        if (userIds.length === 2) {
            return (
                getPrettyDisplayNameOrYou(userIds[0]) +
                ' and ' +
                getPrettyDisplayNameOrYou(userIds[1]) +
                ' traded'
            )
        }
        const prefix =
            getPrettyDisplayNameOrYou(userIds[0]) + ', ' + getPrettyDisplayNameOrYou(userIds[1])
        return userIds.length == 3
            ? prefix + ' and one other traded'
            : prefix + ' and ' + (userIds.length - 2) + ' others traded'
    }, [lookupUser, userIds, myUserId])

    return (
        <Stack horizontal gap="xs" alignItems="center" paddingLeft="sm">
            <Stack horizontal gap="xs">
                {userIds.slice(0, 3).map((userId) => (
                    <Box insetLeft="sm" paddingLeft="xs" key={userId}>
                        <Box border="faint" rounded="full" zIndex="above">
                            <Avatar size="avatar_xs" userId={userId} />
                        </Box>
                    </Box>
                ))}
            </Stack>
            <Text fontSize="sm" color="default">
                {summaryText}
            </Text>
        </Stack>
    )
}
