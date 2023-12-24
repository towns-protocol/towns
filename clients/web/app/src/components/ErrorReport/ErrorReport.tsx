import React, { useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { z } from 'zod'
import { hexlify, randomBytes } from 'ethers/lib/utils'
import { useMutation } from 'wagmi'
import { datadogRum } from '@datadog/browser-rum'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Button, ErrorMessage, FormRender, Icon, Paragraph, Stack, Text, TextField } from '@ui'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { axiosClient } from 'api/apiClient'
import { env } from 'utils'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { useDevice } from 'hooks/useDevice'
import { PanelButton } from '@components/Panel/Panel'
import { bufferedLogger } from 'utils/wrappedlogger'

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

async function postCustomErrorToDatadog(data: FormState, id: string, logs: string) {
    datadogRum.addAction('user-feedback-custom-error', {
        data,
        logs,
        id,
        timestamp: Date.now().toString(),
        location: window.location.href,
        fingerprint: [data.email, Date.now().toString(), id],
    })
}

async function postCustomError(data: FormState) {
    const GATEWAY_SERVER_URL = env.VITE_GATEWAY_URL
    const url = `${GATEWAY_SERVER_URL}/user-feedback`
    // generate a uuid for the custom error
    const logs = bufferedLogger.getBufferAsString()
    data.comments += `\n\nLogs:\n\n${logs}`
    const uuid = hexlify(randomBytes(16))
    const postCustom = await axiosClient.post(
        url,
        JSON.stringify({
            ...data,
            id: uuid,
        }),
    )
    postCustomErrorToDatadog(data, uuid, logs)
    return postCustom
}

export const ErrorReportModal = (props: { minimal?: boolean }) => {
    const [modal, setModal] = useState(false)
    const onHide = useEvent(() => {
        setModal(false)
    })

    const onShow = useEvent(() => {
        setModal(true)
    })

    return (
        <>
            <PanelButton centerContent background="level2" onClick={onShow}>
                <Icon type="help" size="square_sm" />
                {!props.minimal && <Paragraph>Report a bug</Paragraph>}
            </PanelButton>

            {modal && (
                <ModalContainer onHide={onHide}>
                    <ErrorReportForm onHide={onHide} />
                </ModalContainer>
            )}
        </>
    )
}

export const ErrorReportForm = (props: { onHide: () => void }) => {
    const [success, setSuccess] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { isTouch } = useDevice()
    const { mutate: doCustomError, isLoading } = useMutation(postCustomError)

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
        <Stack padding={isTouch ? 'md' : 'none'} gap="lg">
            <FormRender<FormState>
                defaultValues={defaultValues}
                schema={schema}
                id="error-report-form"
                onSubmit={(data) => {
                    doCustomError(data, {
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
