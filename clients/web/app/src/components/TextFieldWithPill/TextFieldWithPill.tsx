import React, { useRef } from 'react'
import { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { clsx } from 'clsx'
import { Box } from '@ui'
import { FieldOutline } from 'ui/components/_internal/Field/FieldOutline/FieldOutline'
import { baseFieldStyles, textFieldStyle } from './TextFieldWithPill.css'

type Props<PillPayload, HookFormValues extends FieldValues> = {
    name: Path<HookFormValues>
    pills: PillPayload[]
    placeholder?: string
    renderPill?: (args: PillPayload) => React.ReactNode
} & Partial<UseFormReturn<HookFormValues>>

export const TextFieldWithPill = <T, HookFormValues extends FieldValues>(
    props: Props<T, HookFormValues>,
) => {
    const { register, name, pills, placeholder, renderPill } = props
    const inputRef = useRef<HTMLInputElement>(null)

    return (
        <Box
            flexDirection="row"
            background="level2"
            borderRadius="sm"
            position="relative"
            padding="sm"
            cursor="text"
            onClick={() => inputRef.current?.focus()}
        >
            <Box
                display="inline-flex"
                flexDirection="row"
                flexWrap="wrap"
                gap="sm"
                alignItems="center"
            >
                {pills.map((args: T) => renderPill?.(args))}
                <Box
                    ref={inputRef}
                    minWidth="100"
                    padding="sm"
                    as="input"
                    type="text"
                    placeholder={placeholder}
                    className={clsx([textFieldStyle, baseFieldStyles])}
                    {...register?.(name)}
                />
                <FieldOutline tone="neutral" />
            </Box>
        </Box>
    )
}
