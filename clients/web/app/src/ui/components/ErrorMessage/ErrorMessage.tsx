import * as React from 'react'
import { FieldErrors, get, useFormContext } from 'react-hook-form'
import { Box } from '../Box/Box'
import { Text } from '../Text/Text'

type Props = {
    errors: FieldErrors
    fieldName: string
    message?: string
}

const ErrorMessage = ({ errors, fieldName, message }: Props) => {
    const methods = useFormContext()
    const error = get(errors || methods.formState.errors, fieldName)
    const registrationMessage = error?.message
    const errorMessage = !error ? '\u00A0' : message || registrationMessage

    return (
        <Box>
            <ErrorMessageText message={errorMessage} />
        </Box>
    )
}

const ErrorMessageText = ({ message }: { message: string }) => {
    return (
        <Text color="negative" size="sm">
            {message}
        </Text>
    )
}

export { ErrorMessage, ErrorMessageText }
