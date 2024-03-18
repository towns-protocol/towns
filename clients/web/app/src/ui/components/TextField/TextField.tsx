import { clsx } from 'clsx'
import React, { InputHTMLAttributes, forwardRef } from 'react'
import { Box } from '../Box/Box'
import { Field, FieldBaseProps } from '../_internal/Field/Field'
import * as styles from './TextField.css'
import { TextProps } from '../Text/Text'

type NativeInputProps = React.AllHTMLAttributes<HTMLInputElement>

type InputCallbackProps = {
    onBlur?: NativeInputProps['onBlur']
    onChange?: React.EventHandler<React.ChangeEvent<HTMLInputElement>>
    onFocus?: NativeInputProps['onFocus']
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}

type Props = {
    placeholder?: string
    type?: NativeInputProps['type']
    fontSize?: TextProps['fontSize']
    textAlign?: TextProps['textAlign']
} & FieldBaseProps &
    InputCallbackProps &
    InputHTMLAttributes<HTMLInputElement>

export const TextField = forwardRef<HTMLInputElement, Props>((props, ref) => {
    const { type, placeholder, fontSize, autoComplete, ...fieldProps } = props
    return (
        <Field {...fieldProps}>
            {(overlays, { className, ...inputProps }) => (
                <>
                    <Box
                        ref={ref}
                        as="input"
                        {...inputProps}
                        type={type}
                        placeholder={placeholder}
                        className={clsx(className, styles.input)}
                        fontSize={fontSize}
                        autoComplete={autoComplete || 'off'}
                    />
                    {overlays}
                </>
            )}
        </Field>
    )
})
