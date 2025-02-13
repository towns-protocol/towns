import React from 'react'
import { Box, Icon, Stack, Text } from '@ui'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { GetCoinDataResponse } from '@components/TradingChart/useCoinData'
import { LifiQuote } from '../useLifiQuote'
import { ChainConfig } from '../tradingConstants'

export const QuoteCard = (
    props: LifiQuote & {
        chainConfig: ChainConfig
        fromTokenAddress: string
        toTokenAddress: string
        chainId: string
        fromTokenData: GetCoinDataResponse | undefined
        toTokenData: GetCoinDataResponse | undefined
    },
) => {
    const { estimate } = props

    return (
        <Stack background="level2" rounded="sm" height="100">
            <ValueRow
                chainConfig={props.chainConfig}
                amount={estimate.fromAmount}
                amountUSD={estimate.fromAmountUSD}
                tokenAddress={props.fromTokenAddress}
                tokenData={props.fromTokenData}
            />
            <Separator />
            <ValueRow
                chainConfig={props.chainConfig}
                amount={estimate.toAmount}
                amountUSD={estimate.toAmountUSD}
                tokenAddress={props.toTokenAddress}
                tokenData={props.toTokenData}
            />
        </Stack>
    )
}

const ValueRow = (props: {
    amount: string
    amountUSD: string
    tokenAddress: string
    chainConfig: ChainConfig
    tokenData: GetCoinDataResponse | undefined
}) => {
    const { amount, amountUSD, tokenAddress, chainConfig, tokenData } = props

    if (tokenAddress === chainConfig.nativeTokenAddress) {
        return (
            <Row
                left={
                    <>
                        <Icon type={chainConfig.icon} size="square_sm" />
                        <Text>
                            {formatUnitsToFixedLength(BigInt(amount), chainConfig.decimals, 5)}{' '}
                        </Text>
                        <Text>{tokenData?.token.symbol}</Text>
                    </>
                }
                right={<Text>${amountUSD}</Text>}
            />
        )
    }

    const imageUrl = tokenData?.token.info.imageThumbUrl
    const name = tokenData?.token.name
    const symbol = tokenData?.token.symbol
    const formatedValue = formatUnitsToFixedLength(BigInt(amount), chainConfig.decimals, 5)
    return (
        <Row
            left={
                <>
                    {!!imageUrl && (
                        <Box
                            as="img"
                            rounded="full"
                            square="square_sm"
                            src={imageUrl}
                            alt="fromToken"
                            overflow="hidden"
                        />
                    )}
                    <Text>{formatedValue}</Text>
                    <Text>{symbol}</Text>
                </>
            }
            right={<Text>{name !== symbol ? name : ''}</Text>}
        />
    )
}

const Row = (props: { left: React.ReactNode; right: React.ReactNode }) => {
    return (
        <Stack padding horizontal grow justifyContent="spaceBetween" alignItems="center">
            <Stack horizontal gap="sm" alignItems="center">
                {props.left}
            </Stack>
            <Stack horizontal gap="sm" alignItems="center">
                {props.right}
            </Stack>
        </Stack>
    )
}

const Separator = () => (
    <Stack
        horizontal
        borderBottom
        centerContent
        justifyContent="spaceBetween"
        alignItems="center"
        position="relative"
    >
        <Box
            centerContent
            position="absolute"
            top="none"
            square="square_md"
            background="level3"
            rounded="full"
            style={{ transform: `translateY(-50%)` }}
        >
            <Icon
                type="arrowDown"
                size="square_xs"
                color="gray2"
                style={{ transform: `translateY(0.5px)` }}
            />
        </Box>
    </Stack>
)
