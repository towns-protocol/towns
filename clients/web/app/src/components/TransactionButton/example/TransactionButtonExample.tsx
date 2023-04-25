import React, { useState } from 'react'
import { TransactionUIState } from 'hooks/useTransactionStatus'
import { Box, Paragraph, RadioSelect, Stack, Toggle } from '@ui'
import { TransactionButton } from '../TransactionButton'

export const TransactionButtonExample = () => {
    const [transactionState, setTransactionState] = useState(TransactionUIState.None)
    const [enabled, setEnabled] = useState(true)

    function onUpdateTransactionState(e: any) {
        setTransactionState(e.target?.value ?? '')
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
                            { value: 'None', label: 'None' },
                            { value: 'Pending', label: 'Pending' },
                            { value: 'PendingWithData', label: 'PendingWithData' },
                            { value: 'Success', label: 'Success' },
                        ]}
                        onChange={onUpdateTransactionState}
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
