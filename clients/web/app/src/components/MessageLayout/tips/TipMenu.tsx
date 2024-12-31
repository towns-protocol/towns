import React from 'react'
import { env } from 'utils'
import { Button, MotionBox, Stack, Text } from '@ui'
import type { TipOption } from './types'
import { trackTipAmount } from './tipAnalytics'

const tipOptions: TipOption[] = [
    {
        amountInCents: 25,
        label: '$0.25',
    },
    {
        amountInCents: 100,
        label: '$1',
    },
    {
        amountInCents: 500,
        label: '$5',
    },
]

export function TipMenu(props: {
    tipValue: TipOption | undefined
    setTipValue: (option: TipOption | undefined) => void
    inSheet?: boolean
    confirmRenderer: React.ReactNode
}) {
    const { tipValue, setTipValue, confirmRenderer, inSheet } = props

    if (!env.VITE_TIPS_ENABLED) {
        return null
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
        >
            {tipValue ? (
                confirmRenderer
            ) : (
                <>
                    <Text strong textAlign="center">
                        Tip Amount
                    </Text>
                    <Stack gap="sm">
                        {tipOptions.map((tip) => (
                            <TipOption
                                key={tip.amountInCents}
                                option={tip}
                                setTipValue={setTipValue}
                            />
                        ))}
                    </Stack>
                </>
            )}
        </MotionBox>
    )
}

function TipOption(props: { option: TipOption; setTipValue: (option: TipOption) => void }) {
    const { option, setTipValue } = props
    return (
        <Button
            rounded="md"
            size="button_sm"
            key={option.amountInCents}
            onClick={(e) => {
                e.stopPropagation()
                trackTipAmount(option.amountInCents)
                setTipValue(option)
            }}
        >
            {option.label}
        </Button>
    )
}
