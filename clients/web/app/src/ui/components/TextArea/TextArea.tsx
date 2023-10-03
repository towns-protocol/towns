import { clsx } from 'clsx'
import React, { InputHTMLAttributes, forwardRef, useCallback, useState } from 'react'
import { Box } from '../Box/Box'
import { Text, TextProps } from '../Text/Text'
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
    fontSize?: TextProps['size']
} & FieldBaseProps &
    InputCallbackProps &
    Omit<InputHTMLAttributes<HTMLTextAreaElement>, 'color'>

export const TextArea = forwardRef<HTMLTextAreaElement, Props>((props, ref) => {
    const { placeholder, onChange, fontSize, ...fieldProps } = props
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

    // hack to restore carret at the end of the input on autofocus
    const onFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        e.target.value = ''
        e.target.value = value
    }, [])

    return (
        <Field {...fieldProps}>
            {(overlays, { className, ...inputProps }) => (
                <>
                    <Box
                        ref={ref}
                        as="textarea"
                        fontSize={fontSize}
                        {...inputProps}
                        placeholder={placeholder}
                        className={clsx(className, styles.input)}
                        onChange={_onChange}
                        onFocus={onFocus}
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
