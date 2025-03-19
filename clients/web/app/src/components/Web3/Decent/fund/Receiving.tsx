import React from 'react'
import { Stack, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { Section } from './Section'
import { useFundContext } from './FundContext'
import { NetworkLogo } from '../NetworkLogo'
import { useDecentUsdConversion, useUsdOrTokenConversion } from '../useDecentUsdConversion'

export function Receiving() {
    const { dstToken, boxActionResponse } = useFundContext()
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const { data: dstTokenPriceInUsd } = useDecentUsdConversion(dstToken)
    const conversion = useUsdOrTokenConversion()

    const convertedAmount = !dstTokenPriceInUsd
        ? '-'
        : conversion({
              tokenAmount: boxActionResponse?.amountOut?.amount,
              tokenPriceInUsd: dstTokenPriceInUsd?.quote?.formatted,
              decimals: boxActionResponse?.amountOut?.decimals,
              symbol: dstToken?.symbol,
          })

    return (
        <Section>
            <Stack gap="sm">
                <Stack horizontal alignItems="center" justifyContent="spaceBetween">
                    <Text>Receiving</Text>
                    <Stack centerContent horizontal gap="sm">
                        {dstToken && <NetworkLogo token={dstToken} />}
                        <Text color="gray2">{convertedAmount}</Text>
                    </Stack>
                </Stack>

                <Stack horizontal alignItems="center" justifyContent="spaceBetween">
                    <Text>To</Text>
                    <Stack horizontal gap="sm">
                        <Text>Towns Wallet</Text>
                        <Stack tooltip={myAbstractAccountAddress}>
                            <Text color="gray2">
                                {shortAddress(myAbstractAccountAddress ?? '')}
                            </Text>
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>
        </Section>
    )
}
