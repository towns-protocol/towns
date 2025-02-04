import React from 'react'
import { Stack, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { useMyAbstractAccountAddress } from '@components/Web3/UserOpTxModal/hooks/useMyAbstractAccountAddress'
import { Section } from './Section'
import { useFundContext } from './FundContext'
import { NetworkLogo } from '../NetworkLogo'

export function Receiving() {
    const { dstToken, usdAmount } = useFundContext()
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data

    return (
        <Section>
            <Stack gap="sm">
                <Stack horizontal alignItems="center" justifyContent="spaceBetween">
                    <Text>Receiving</Text>
                    <Stack centerContent horizontal gap="sm">
                        {dstToken && <NetworkLogo token={dstToken} />}
                        <Text color="gray2">{usdAmount}</Text>
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
