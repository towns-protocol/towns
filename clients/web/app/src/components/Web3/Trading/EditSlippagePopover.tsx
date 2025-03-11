import React, { useCallback, useContext } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Box, Button, CardOpener, IconButton, Paragraph, TextField } from '@ui'
import { CardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { useTradeSettings } from './tradeSettingsStore'

export const EditSlippageButton = () => {
    const slippage = useTradeSettings(useShallow(({ slippage }) => slippage))
    return (
        <CardOpener trigger="click" placement="vertical" render={<SlippagePopover />}>
            {({ triggerProps }) => (
                <Box tooltip={`Edit slippage (${slippage * 100}%)`}>
                    <IconButton
                        icon="filter"
                        color="gray2"
                        {...triggerProps}
                        ref={triggerProps.ref}
                    />
                </Box>
            )}
        </CardOpener>
    )
}

const SlippagePopover = () => {
    const { slippage, setSlippage } = useTradeSettings(
        useShallow(({ slippage, setSlippage }) => ({ slippage, setSlippage })),
    )

    const cardContext = useContext(CardOpenerContext)

    const onSlippageChange = useCallback(
        (value: string) => {
            const s = parseFloat(value)
            if (typeof s === 'number' && !isNaN(s)) {
                const slippage = s * 0.01
                setSlippage(Math.min(Math.max(slippage, 0), 0.1))
            }
        },
        [setSlippage],
    )

    return (
        <Box
            border
            padding
            gap
            elevate
            key="slippage"
            minWidth="200"
            background="level2"
            rounded="md"
            alignItems="center"
            boxShadow="card"
        >
            <Paragraph whiteSpace="nowrap">Edit slippage</Paragraph>
            <TextField
                type="number"
                width="100%"
                min={0}
                max={10}
                defaultValue={slippage * 100}
                after={<Paragraph>%</Paragraph>}
                background="level2"
                rounded="lg"
                textAlign="center"
                onChange={(e) => onSlippageChange(e.target.value)}
            />
            <Button
                gap="xxs"
                rounded="full"
                width="100%"
                onClick={() => {
                    cardContext?.closeCard()
                }}
            >
                Close
            </Button>
        </Box>
    )
}
