import { clsx } from 'clsx'
import React from 'react'
import { Controller, FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { Stack } from '../../Stack/Stack'
import { Paragraph } from '../../Text/Paragraph'
import * as fieldStyles from '../../_internal/Field/Field.css'
import { FieldOutline } from '../../_internal/Field/FieldOutline/FieldOutline'
import * as style from './RadioSelect/RadioSelect.css'

type Props<T extends FieldValues> = {
    value: string
    title: string
    description: string
    selected?: boolean
    children?: () => React.ReactNode
    name: string
    onClick?: () => void
} & Partial<UseFormReturn<T>>

export const RadioCard = <T extends FieldValues>(props: Props<T>) => {
    const { title, description, children, onClick, name, control } = props

    return (
        <Stack padding gap background="level2" cursor="pointer" borderRadius="sm" onClick={onClick}>
            <Stack horizontal gap justifyContent="spaceBetween" alignItems="start">
                <Stack gap="paragraph">
                    <Paragraph>{title}</Paragraph>
                    <Paragraph size="sm" color="gray2">
                        {description}
                    </Paragraph>
                </Stack>
                <Controller
                    name={name as Path<T>}
                    control={control}
                    render={({ field }) => {
                        return (
                            <Stack position="relative">
                                <input
                                    type="radio"
                                    color="negative"
                                    className={clsx([fieldStyles.field, style.radio])}
                                    name={field.name}
                                    checked={field.value === props.value}
                                    value={props.value}
                                    onChange={() => field.onChange(props.value)}
                                />
                                <FieldOutline tone="neutral" disabled={false} rounded="full" />
                            </Stack>
                        )
                    }}
                />
            </Stack>
            {children?.() ?? <></>}
        </Stack>
    )
}
