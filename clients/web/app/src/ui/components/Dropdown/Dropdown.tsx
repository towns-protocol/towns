import { clsx } from 'clsx'
import React, { useCallback } from 'react'
import { Stack } from '../Stack/Stack'
import { Field, FieldBaseProps } from '../_internal/Field/Field'
import * as styles from './Dropdown.css'
import { Icon } from '../Icon'

type Props = {
    defaultValue?: string
    options: { label: string; value: string }[]
    onChange?: (value: string) => void
} & FieldBaseProps

export const Dropdown = (props: Props) => {
    const { defaultValue, options, onChange: delegatedOnChange, ...fieldProps } = props

    const onChange = useCallback(
        (e: React.FormEvent) => {
            const selectEvent = e as React.FormEvent<HTMLSelectElement>
            delegatedOnChange && delegatedOnChange(selectEvent.currentTarget.value)
        },
        [delegatedOnChange],
    )

    return (
        <Field
            {...fieldProps}
            background={fieldProps.background ?? 'level2'}
            paddingX="none"
            paddingY="none"
        >
            {(overlays, { className, ...inputProps }) => (
                <>
                    <Stack
                        horizontal
                        as="select"
                        cursor="pointer"
                        className={clsx(className, styles.dropdown)}
                        padding="md"
                        rounded="sm"
                        onChange={onChange}
                        {...inputProps}
                        defaultValue={defaultValue}
                    >
                        {options.map((o) => (
                            <option key={o.value} value={o.value}>
                                {String(o.label)}
                            </option>
                        ))}
                        {overlays}
                    </Stack>
                    <Icon type="arrowDown" pointerEvents="none" position="absolute" right="sm" />
                </>
            )}
        </Field>
    )
}
