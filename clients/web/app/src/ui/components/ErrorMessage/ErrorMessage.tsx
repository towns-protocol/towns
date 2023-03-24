import * as React from 'react'
import { FieldErrors, get, useFormContext } from 'react-hook-form'
import { Box, BoxProps } from '../Box/Box'
import { Text, TextProps } from '../Text/Text'

type Props = {
    errors: FieldErrors
    fieldName: string
    message?: string
    textProps?: TextProps
    preventSpace?: boolean
} & BoxProps

const ErrorMessage = (props: Props) => {
    const { errors, fieldName, message, textProps, preventSpace = false, ...boxProps } = props
    const methods = useFormContext()
    const error = get(errors || methods.formState.errors, fieldName)
    const registrationMessage = error?.message
    const errorMessage = !error ? '\u00A0' : message || registrationMessage

    return preventSpace && !error ? (
        <></>
    ) : (
        <Box {...boxProps}>
            <ErrorMessageText {...textProps} message={errorMessage} />
        </Box>
    )
}

const ErrorMessageText = (props: { message: string } & TextProps) => {
    const { message, ...textProps } = props
    return (
        <Text color="error" size="sm" {...textProps}>
            {message}
        </Text>
    )
}

export { ErrorMessage, ErrorMessageText }
