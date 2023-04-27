import React, { ChangeEvent, useState } from 'react'
import { z } from 'zod'
import { TransactionUIState } from 'hooks/useTransactionStatus'
import { Box, Paragraph, RadioSelect, Stack, Toggle } from '@ui'
import { TransactionButton } from '../TransactionButton'

const zTransactionUIState = z.nativeEnum(TransactionUIState)

export const TransactionButtonExample = () => {
    const [transactionState, setTransactionState] = useState(TransactionUIState.None)
    const [enabled, setEnabled] = useState(true)

    function onChange(e: ChangeEvent<HTMLSelectElement>) {
        const value = zTransactionUIState.parse(e.target.value)
        setTransactionState(value)
    }

    return (
        <Stack centerContent gap>
            <TransactionButton
                disabled={!enabled}
                transactionState={transactionState}
                signingText="Waiting for wallet..."
                transactingText="Creating channel"
                successText="Channel created!"
                idleText="Create"
            />

            <Box>
                <Stack horizontal gap="sm">
                    <RadioSelect
                        label="Checkbox Label"
                        options={[
                            { value: TransactionUIState.None, label: 'None' },
                            { value: TransactionUIState.Pending, label: 'Pending' },
                            { value: TransactionUIState.PendingWithData, label: 'PendingWithData' },
                            { value: TransactionUIState.Success, label: 'Success' },
                        ]}
                        onChange={onChange}
                    />

                    <Box horizontal padding="sm" alignItems="center" gap="sm" justifySelf="start">
                        <Toggle toggled={enabled} onToggle={() => setEnabled((v) => !v)} />
                        <Paragraph>toggle enabled</Paragraph>
                    </Box>
                </Stack>
            </Box>
        </Stack>
    )
}
