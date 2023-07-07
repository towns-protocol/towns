import { clsx } from 'clsx'
import React from 'react'
import { Controller, UseFormReturn } from 'react-hook-form'
import { Stack } from '../../Stack/Stack'
import { Paragraph } from '../../Text/Paragraph'
import { MotionBox, MotionStack } from '../../Motion/MotionComponents'
import * as fieldStyles from '../../_internal/Field/Field.css'
import { FieldOutline } from '../../_internal/Field/FieldOutline/FieldOutline'
import * as style from './RadioSelect/RadioSelect.css'

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
        <MotionStack
            layout
            padding
            gap
            style={{ borderRadius: 8, originY: 0 }}
            background="level2"
            cursor="pointer"
            borderRadius="sm"
            overflow="hidden"
            onClick={onClick}
        >
            <MotionBox
                horizontal
                layout="position"
                justifyContent="spaceBetween"
                alignItems="start"
            >
                <Stack gap="paragraph">
                    <Paragraph>{title}</Paragraph>
                    <Paragraph size="sm" color="gray2">
                        {description}
                    </Paragraph>
                </Stack>
                <Controller
                    name={name}
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
            </MotionBox>
            {children?.() ?? <></>}
        </MotionStack>
    )
}
