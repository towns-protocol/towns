import noop from 'lodash'
import React, { useCallback, useState } from 'react'
import { Box, Stack, Text, TextField } from '@ui'

export const EditableInputField = (props: {
    title: string
    value: string
    placeholder: string
    dataTestId?: string
    error?: string
    maxLength: number
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    onKeyDown?: (e: React.KeyboardEvent) => void
}) => {
    const { title, value, placeholder, dataTestId, error, maxLength, onChange, onKeyDown } = props
    const charsRemaining = maxLength - value.length
    const [isEditing, setIsEditing] = useState<boolean>(false)
    const editingStateChanged = useCallback(
        (active: boolean) => {
            setIsEditing(active)
        },
        [setIsEditing],
    )

    const charLimitExceeded = charsRemaining < 0
    return (
        <Stack gap="paragraph">
            <Text color="default" fontSize="sm" fontWeight="medium">
                {title}
            </Text>
            <Stack horizontal gap alignItems="center" background="level3" rounded="sm">
                <Box position="relative" width="100%">
                    <TextField
                        border
                        width="100%"
                        value={value}
                        height="height_lg"
                        paddingX="sm"
                        placeholder={placeholder}
                        data-testid={dataTestId}
                        // need to manually override paddingRight for the chars remaining to fit
                        style={{ paddingRight: '20px' }}
                        autoCorrect="off"
                        onKeyDown={onKeyDown || noop}
                        onChange={onChange}
                        onFocus={() => editingStateChanged(true)}
                        onBlur={() => editingStateChanged(false)}
                    />
                    <Box
                        centerContent
                        height="100%"
                        position="absolute"
                        right="sm"
                        visibility={isEditing || charLimitExceeded ? 'visible' : 'hidden'}
                    >
                        <Text color={charLimitExceeded ? 'error' : 'gray2'} size="xs">
                            {charsRemaining.toString()}
                        </Text>
                    </Box>
                </Box>
            </Stack>
            {error && (
                <Text color="error" size="sm">
                    {error}
                </Text>
            )}
        </Stack>
    )
}
