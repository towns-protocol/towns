import { clsx } from 'clsx'
import React, { InputHTMLAttributes, forwardRef, useCallback, useState } from 'react'
import { Box } from '../Box/Box'
import { Text } from '../Text/Text'
import { Field, FieldBaseProps } from '../_internal/Field/Field'
import * as styles from './TextArea.css'

type NativeInputProps = React.AllHTMLAttributes<HTMLTextAreaElement>

type InputCallbackProps = {
    onBlur?: NativeInputProps['onBlur']
    onChange?: React.EventHandler<React.ChangeEvent<HTMLTextAreaElement>>
    onFocus?: NativeInputProps['onFocus']
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>
}

type Props = {
    placeholder?: string
} & FieldBaseProps &
    InputCallbackProps &
    InputHTMLAttributes<HTMLTextAreaElement>

export const TextArea = forwardRef<HTMLTextAreaElement, Props>((props, ref) => {
    const { placeholder, onChange, ...fieldProps } = props
    const [length, setLength] = useState(
        props.defaultValue?.toString().length || props.value?.toString().length || 0,
    )
    const _onChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setLength(e.target.value.length)
            onChange?.(e)
        },
        [onChange],
    )
    return (
        <Field {...fieldProps}>
            {(overlays, { className, ...inputProps }) => (
                <>
                    <Box
                        ref={ref}
                        as="textarea"
                        {...inputProps}
                        placeholder={placeholder}
                        className={clsx(className, styles.input)}
                        onChange={_onChange}
                    />
                    {overlays}
                    {inputProps.maxLength && (
                        <Box position="absolute" right="md" bottom="md">
                            <Text size="sm">{inputProps.maxLength - length}</Text>
                        </Box>
                    )}
                </>
            )}
        </Field>
    )
})
