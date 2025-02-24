import React, { useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { ChainId } from '@decent.xyz/box-common'
import debounce from 'lodash/debounce'
import { useUsersBalances } from '@decent.xyz/box-hooks'
import { ErrorMessage, Icon, Stack, Text, TextField } from '@ui'
import { useEthInputChange } from '@components/Web3/EditMembership/useEthInputChange'
import { formatUnitsToFixedLength, parseUnits } from 'hooks/useBalance'
import { Section } from '@components/Web3/Decent/fund/Section'
import { NetworkLogo } from '@components/Web3/Decent/NetworkLogo'
import { TokenAmountSchema } from '@components/Web3/Decent/fund/formSchema'
import { useFundContext } from './FundContext'
import { useDecentUsdConversion, useUsdOrTokenConversion } from '../useDecentUsdConversion'

export function Sending(props: { setShowChainSelector: (show: boolean) => void }) {
    const { setShowChainSelector } = props
    const { srcToken, sender, amount } = useFundContext()
    const { data: tokenPriceInUsd } = useDecentUsdConversion(srcToken)
    const conversion = useUsdOrTokenConversion()

    const { tokens } = useUsersBalances({
        address: sender,
        chainId: srcToken?.chainId ?? ChainId.ETHEREUM,
        enable: !!sender && !!srcToken,
    })
    const srcTokenBalance = tokens?.find(
        (t) => t.chainId === srcToken?.chainId && t.address === srcToken?.address,
    )

    const convertedAmount = !tokenPriceInUsd
        ? '-'
        : conversion({
              tokenAmount: amount,
              tokenPriceInUsd: tokenPriceInUsd?.quote?.formatted,
              decimals: srcToken?.decimals,
              symbol: srcToken?.symbol,
          })

    return (
        <Section>
            <Stack horizontal alignItems="center">
                <Stack gap="md">
                    <Text>Sending</Text>
                    <TokenAmountField />
                    <Text color="gray2">{convertedAmount}</Text>
                </Stack>
                <Stack centerContent gap="sm">
                    <Stack
                        horizontal
                        hoverable
                        as="button"
                        alignItems="center"
                        gap="sm"
                        background="level3"
                        rounded="lg"
                        paddingY="xxs"
                        paddingX="xs"
                        cursor="pointer"
                        onClick={() => setShowChainSelector(true)}
                    >
                        {srcToken && <NetworkLogo token={srcToken} />}
                        <Text strong size="lg" whiteSpace="nowrap">
                            {srcToken?.name}
                        </Text>
                        <Icon type="arrowDown" size="square_sm" />
                    </Stack>
                    <Text size="sm" color="gray2">
                        Balance:{' '}
                        {srcToken &&
                            formatUnitsToFixedLength(
                                srcTokenBalance?.balance ?? 0n,
                                srcToken.decimals,
                                5,
                            )}
                    </Text>
                </Stack>
            </Stack>
        </Section>
    )
}

const numberRegex = /^-?\d+(\.\d+)?$/

function handleAmount(amount: string) {
    const [integer, decimal] = amount.split('.')
    if (!decimal) {
        return integer
    }
    if (integer === '') {
        return '0.' + decimal
    }
    return amount
}

function TokenAmountField() {
    const { setAmount, disabled, srcToken } = useFundContext()
    const { register, watch, setValue, trigger, formState } = useFormContext<TokenAmountSchema>()
    const tokenAmount = watch('tokenAmount')
    const onCostChange = useEthInputChange(tokenAmount ?? '', 'tokenAmount', setValue, trigger)

    const debouncedDispatch = useMemo(() => {
        return debounce((amount: string) => {
            const _amount = handleAmount(amount)
            const isNumber = numberRegex.test(_amount)

            if (isNumber) {
                setAmount(parseUnits(_amount, srcToken?.decimals))
            }
        }, 500)
    }, [setAmount, srcToken])

    useEffect(() => {
        debouncedDispatch(tokenAmount ?? '0')
        return () => debouncedDispatch.cancel()
    }, [tokenAmount, debouncedDispatch])

    return (
        <Stack grow width="100%">
            <TextField
                autoFocus
                border="none"
                inputWidth="100%"
                fontSize="h1"
                fontWeight="strong"
                tone="none"
                paddingX="none"
                inputLimit={8}
                placeholder="0"
                disabled={disabled}
                {...register('tokenAmount')}
                onChange={(e) => onCostChange(e.target.value)}
            />
            {formState.errors.tokenAmount ? (
                <ErrorMessage errors={formState.errors} fieldName="tokenAmount" />
            ) : (
                <Text size="sm">&nbsp;</Text>
            )}
        </Stack>
    )
}
