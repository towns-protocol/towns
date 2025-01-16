import React, { useState } from 'react'
import { Box, Button, Stack, Text, TextField } from '@ui'
import { TipOption } from './types'

interface CustomTipInputProps {
    onConfirm: (option: TipOption) => void
    onCancel: () => void
}

export function CustomTipInput({ onConfirm, onCancel }: CustomTipInputProps) {
    const [amount, setAmount] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        // Allow only numbers and decimals
        if (!/^\d*\.?\d{0,2}$/.test(value)) {
            return
        }
        setAmount(value)
        setError(null)
    }

    const handleConfirm = () => {
        const numAmount = parseFloat(amount)
        if (!amount || isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid amount')
            return
        }

        onConfirm({
            amountInCents: Math.round(numAmount * 100),
            label: `$${amount}`,
        })
    }

    return (
        <Stack gap="md">
            <Text strong textAlign="center">
                Enter Amount
            </Text>
            <Box position="relative">
                <Stack horizontal alignItems="center" gap="xs">
                    <TextField
                        autoFocus
                        placeholder="0.00"
                        tone={error ? 'error' : 'neutral'}
                        value={amount}
                        onChange={handleAmountChange}
                    />
                    <Text>USD</Text>
                </Stack>
                {error && (
                    <Text size="sm" color="error" style={{ position: 'absolute', bottom: '-20px' }}>
                        {error}
                    </Text>
                )}
            </Box>
            <Stack gap="sm">
                <Button tone="cta1" rounded="md" size="button_sm" onClick={handleConfirm}>
                    Confirm
                </Button>
                <Button color="cta1" rounded="md" size="button_sm" onClick={onCancel}>
                    Cancel
                </Button>
            </Stack>
        </Stack>
    )
}
