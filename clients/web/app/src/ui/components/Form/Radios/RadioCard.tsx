import React from 'react'
import { Controller, UseFormReturn } from 'react-hook-form'
import { clsx } from 'clsx'
import { Box, Stack, Text } from '@ui'
import * as style from './RadioSelect/RadioSelect.css'
import * as fieldStyles from '../../_internal/Field/Field.css'
import { FieldOutline } from '../../_internal/Field/FieldOutline'

type Props = {
    value: string
    title: string
    description: string
    selected?: boolean
    children?: () => React.ReactNode
    name: string
    onClick?: () => void
} & Partial<UseFormReturn>

export const RadioCard = (props: Props) => {
    const { title, description, children, onClick, name, control } = props

    return (
        <Box padding="md" background="level2" cursor="pointer" borderRadius="sm" onClick={onClick}>
            <Box justifyContent="spaceBetween" flexDirection="row" alignItems="start">
                <Stack gap="sm">
                    <Text>{title}</Text>
                    <Text size="sm" color="gray2">
                        {description}
                    </Text>
                </Stack>
                <Controller
                    name={name}
                    control={control}
                    render={({ field }) => {
                        return (
                            <Stack position="relative">
                                <input
                                    readOnly // b/c of react controlled component errors. Probably doing something else wrong with react-hook-form b/c including field.onChange like I thought doesn't register the change
                                    type="radio"
                                    color="negative"
                                    className={clsx([fieldStyles.field, style.radio])}
                                    name={field.name}
                                    checked={field.value === props.value}
                                    value={field.value}
                                />
                                <FieldOutline tone="neutral" disabled={false} rounded="full" />
                            </Stack>
                        )
                    }}
                />
            </Box>
            {children?.()}
        </Box>
    )
}
