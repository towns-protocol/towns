import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { GetCoinDataResponse } from '@components/TradingChart/useCoinData'
import { ChainConfig } from '../tradingConstants'

export const getTokenValueData = (props: {
    amount: string
    tokenAddress: string
    chainConfig: ChainConfig
    tokenData: GetCoinDataResponse | undefined
}) => {
    const { amount, tokenAddress, chainConfig, tokenData } = props

    const name = tokenData?.token.name
    const symbol = tokenData?.token.symbol

    if (tokenAddress === chainConfig.nativeTokenAddress) {
        return {
            icon: chainConfig.icon,
            value: formatUnitsToFixedLength(BigInt(amount), chainConfig.decimals, 5),
            symbol,
            name,
        }
    }

    const imageUrl = tokenData?.token.info.imageThumbUrl
    const formatedValue = formatUnitsToFixedLength(BigInt(amount), tokenData?.token.decimals, 5)

    return {
        icon: imageUrl,
        value: formatedValue,
        symbol,
        name,
    }
}
