import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { env } from 'utils'
import { Box, Button, MotionBox, Stack, Text, TextField } from '@ui'
import { useEthPrice } from '@components/Web3/useEthPrice'
import type { TipOption } from './types'
import { trackTipAmount } from './tipAnalytics'

const IS_ETH_MODE = env.VITE_TIPS_IN_ETH

const tipOptions: TipOption[] = IS_ETH_MODE
    ? [
          {
              amountInCents: 0, // Will be calculated based on current ETH price
              ethAmount: 0.0003,
              label: '0.0003 ETH',
          },
          {
              amountInCents: 0, // Will be calculated based on current ETH price
              ethAmount: 0.0015,
              label: '0.0015 ETH',
          },
          {
              amountInCents: 0, // Will be calculated based on current ETH price
              ethAmount: 0.003,
              label: '0.003 ETH',
          },
      ]
    : [
          {
              amountInCents: 100,
              label: '$1',
          },
          {
              amountInCents: 500,
              label: '$5',
          },
          {
              amountInCents: 1_000,
              label: '$10',
          },
      ]

const BUTTON_HEIGHT = '40px'
const MODAL_WIDTH = '200px'

const customTipSchema = z.object({
    amount: z
        .string()
        .refine(
            (val) => (IS_ETH_MODE ? /^\d*\.?\d{0,18}$/.test(val) : /^\d*\.?\d{0,2}$/.test(val)),
            {
                message: IS_ETH_MODE
                    ? 'Please enter a valid amount (max 18 decimal places)'
                    : 'Please enter a valid amount (max 2 decimal places)',
            },
        )
        .refine((val) => {
            const num = parseFloat(val)
            return !val || (!isNaN(num) && num > 0)
        }, 'Amount must be greater than 0'),
})

type CustomTipForm = z.infer<typeof customTipSchema>

export function TipMenu(props: {
    tipValue: TipOption | undefined
    setTipValue: (option: TipOption | undefined) => void
    inSheet?: boolean
    confirmRenderer: React.ReactNode
}) {
    const { tipValue, setTipValue, confirmRenderer, inSheet } = props
    const {
        register,
        formState: { errors },
        watch,
        handleSubmit,
    } = useForm<CustomTipForm>({
        resolver: zodResolver(customTipSchema),
        mode: 'onChange',
    })

    const { data: ethPrice } = useEthPrice({
        enabled: true,
        refetchInterval: 8_000,
    })

    if (!env.VITE_TIPS_ENABLED) {
        return null
    }

    const amount = watch('amount')

    const handleTip = (tip: TipOption | CustomTipForm) => {
        let option: TipOption
        if ('amount' in tip) {
            // Handle custom tip
            const numAmount = parseFloat(tip.amount)
            if (isNaN(numAmount) || numAmount <= 0) {
                return
            }

            if (IS_ETH_MODE) {
                const ethPriceNum = Number(ethPrice)
                if (!isNaN(ethPriceNum) && !isNaN(numAmount)) {
                    option = {
                        amountInCents: Math.round(numAmount * ethPriceNum * 100),
                        ethAmount: numAmount,
                        label: `${numAmount} ETH`,
                    }
                } else {
                    return
                }
            } else {
                option = {
                    amountInCents: Math.round(numAmount * 100),
                    label: `$${Number(numAmount).toFixed(2)}`,
                }
            }
        } else {
            // Handle preset tip
            if (IS_ETH_MODE && ethPrice && tip.ethAmount) {
                // Update amountInCents based on current ETH price
                const ethPriceNum = Number(ethPrice)
                const ethAmountNum = Number(tip.ethAmount)
                if (!isNaN(ethPriceNum) && !isNaN(ethAmountNum)) {
                    const cents = ethAmountNum * ethPriceNum * 100
                    tip.amountInCents = Math.round(cents)
                }
            }
            option = tip
        }

        console.log('handleTip:', option)
        trackTipAmount(option.amountInCents)
        // Use setTimeout to ensure this runs after the current event loop
        setTimeout(() => {
            setTipValue(option)
        }, 0)
    }

    return (
        <MotionBox
            padding={!inSheet}
            border={!inSheet}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            gap="md"
            background="level1"
            borderRadius="sm"
            boxShadow="card"
            pointerEvents="auto"
            style={{
                width: inSheet ? '100%' : MODAL_WIDTH,
                ...(!inSheet && {
                    position: 'relative',
                    right: '0',
                }),
            }}
        >
            {tipValue !== undefined ? (
                <Box pointerEvents="auto">{confirmRenderer}</Box>
            ) : (
                <>
                    <Text strong textAlign="center">
                        Tip Amount
                    </Text>
                    <Stack gap="sm" as="form" onSubmit={handleSubmit(handleTip)}>
                        {tipOptions.map((tip) => (
                            <Button
                                key={tip.ethAmount || tip.amountInCents}
                                rounded="md"
                                size="button_sm"
                                style={{ height: BUTTON_HEIGHT }}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    handleTip(tip)
                                }}
                            >
                                {tip.label}
                            </Button>
                        ))}
                        <Box position="relative">
                            <Box
                                background="level3"
                                rounded="md"
                                padding="sm"
                                style={{ cursor: 'text', height: BUTTON_HEIGHT }}
                                onClick={(e) => {
                                    const input = e.currentTarget.querySelector('input')
                                    if (input) {
                                        input.focus()
                                    }
                                }}
                            >
                                <Stack
                                    horizontal
                                    alignItems="center"
                                    gap="md"
                                    height="100%"
                                    paddingX="xs"
                                >
                                    <TextField
                                        {...register('amount')}
                                        placeholder="Amount"
                                        background="none"
                                        style={{
                                            padding: 0,
                                            height: '25px',
                                            flex: 1,
                                            fontSize: '16px',
                                            width: '75%',
                                        }}
                                        type="number"
                                        step={IS_ETH_MODE ? '0.000000000000000001' : '0.01'}
                                        min={IS_ETH_MODE ? '0.000000000000000001' : '0.01'}
                                        onInput={(e) => {
                                            const value = e.currentTarget.value
                                            if (value.includes('.')) {
                                                const [, decimals] = value.split('.')
                                                if (
                                                    decimals &&
                                                    decimals.length > (IS_ETH_MODE ? 18 : 2)
                                                ) {
                                                    e.currentTarget.value = Number(value).toFixed(
                                                        IS_ETH_MODE ? 18 : 2,
                                                    )
                                                }
                                            }
                                        }}
                                    />
                                    <Text style={{ minWidth: '35px', textAlign: 'left' }}>
                                        {IS_ETH_MODE ? 'ETH' : 'USD'}
                                    </Text>
                                </Stack>
                            </Box>
                        </Box>
                        <Button
                            tone="cta1"
                            rounded="md"
                            size="button_sm"
                            type="submit"
                            style={{ height: BUTTON_HEIGHT }}
                            disabled={!amount || !!errors.amount}
                        >
                            Tip
                        </Button>
                    </Stack>
                </>
            )}
        </MotionBox>
    )
}
