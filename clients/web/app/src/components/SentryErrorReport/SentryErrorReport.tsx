import * as Sentry from '@sentry/react'
import React, { useState } from 'react'
import useEvent from 'react-use-event-hook'
import { z } from 'zod'
import { useMutation } from 'wagmi'
import { format } from 'date-fns'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Button, ErrorMessage, FormRender, Icon, Stack, Text, TextField } from '@ui'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { axiosClient } from 'api/apiClient'
import { env } from 'utils'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'

const FormStateKeys = {
    name: 'name',
    email: 'email',
    comments: 'comments',
} as const

type FormState = {
    [FormStateKeys.name]: string
    [FormStateKeys.email]: string
    [FormStateKeys.comments]: string
}

const schema = z.object({
    [FormStateKeys.name]: z.string().min(1, 'Please enter your name.'),
    [FormStateKeys.email]: z.string().email('Please enter a valid email address.'),
    [FormStateKeys.comments]: z.string().min(1, 'Please enter a description.'),
})

const defaultValues = {
    [FormStateKeys.name]: '',
    [FormStateKeys.email]: '',
    [FormStateKeys.comments]: '',
}

function postSentryError(data: FormState) {
    const URL = 'https://sentry.io/api/0/projects/here-not-there/harmony-web/user-feedback/'
    const message = `User feedback - ${window.location.href} - ${format(
        Date.now(),
        'M/d/yy h:mm a',
    )}`
    const event_id = Sentry.captureMessage(message, {
        // not sure what is necessary here to make this unique and show up in Sentry, so some of this may be duplicated
        fingerprint: [data.email, Date.now().toString()],
        extra: {
            timestamp: Date.now().toString(),
            location: window.location.href,
        },
    })

    return axiosClient.post(
        `${URL}`,
        JSON.stringify({
            event_id, // must be snake_case
            ...data,
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.VITE_SENTRY_BEARER_TOKEN}`,
            },
        },
    )
}

export const SentryReportModal = () => {
    const [modal, setModal] = useState(false)
    const onHide = useEvent(() => {
        setModal(false)
    })

    const onShow = useEvent(() => {
        setModal(true)
    })

    return (
        <>
            <Button rounded="sm" tone="level2" onClick={onShow}>
                <Icon type="help" />
                Report a bug
            </Button>
            {modal && (
                <ModalContainer onHide={onHide}>
                    <SentryErrorReportForm onHide={onHide} />
                </ModalContainer>
            )}
        </>
    )
}

export const SentryErrorReportForm = (props: { onHide: () => void }) => {
    const [success, setSuccess] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const { mutate, isLoading } = useMutation(postSentryError)

    if (success) {
        return (
            <Stack centerContent gap="x4" padding="x4">
                <Text>Thank you for your submission. Our team has been notified.</Text>
                <Button tone="cta1" onClick={props.onHide}>
                    Close
                </Button>
            </Stack>
        )
    }

    return (
        <Stack gap="lg">
            <FormRender<FormState>
                defaultValues={defaultValues}
                schema={schema}
                id="sentry-error-report-form"
                onSubmit={(data) => {
                    mutate(data, {
                        onSuccess: () => {
                            setSuccess(true)
                        },
                        onError: () => {
                            setErrorMessage(
                                `There was an error while submitting your feedback. Please try again later.`,
                            )
                        },
                    })
                }}
            >
                {({ register, formState }) => (
                    <Stack gap="sm">
                        <TextField
                            autoFocus
                            background="level2"
                            placeholder="Name"
                            message={
                                <ErrorMessage
                                    errors={formState.errors}
                                    fieldName={FormStateKeys.name}
                                />
                            }
                            {...register(FormStateKeys.name)}
                        />
                        <TextField
                            autoFocus
                            background="level2"
                            placeholder="Email"
                            message={
                                <ErrorMessage
                                    errors={formState.errors}
                                    fieldName={FormStateKeys.email}
                                />
                            }
                            {...register(FormStateKeys.email)}
                        />
                        <TextArea
                            paddingY="md"
                            background="level2"
                            placeholder="Please describe your issue"
                            height="150"
                            maxLength={400}
                            message={
                                <ErrorMessage
                                    errors={formState.errors}
                                    fieldName={FormStateKeys.comments}
                                />
                            }
                            {...register(FormStateKeys.comments)}
                        />
                        {errorMessage && (
                            <Stack paddingBottom="sm">
                                <Text color="error">{errorMessage}</Text>
                            </Stack>
                        )}
                        <Stack horizontal gap justifyContent="end">
                            <Button onClick={props.onHide}>Cancel</Button>
                            <Button tone="cta1" type="submit" disabled={isLoading}>
                                {isLoading && <ButtonSpinner />}
                                Submit
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </FormRender>
        </Stack>
    )
}
