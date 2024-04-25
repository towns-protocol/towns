import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { z } from 'zod'
import { hexlify, randomBytes } from 'ethers/lib/utils'
import { datadogRum } from '@datadog/browser-rum'
import { useMutation } from '@tanstack/react-query'
import { ModalContainer } from '@components/Modals/ModalContainer'
import {
    Box,
    Button,
    ErrorMessage,
    FormRender,
    Icon,
    MotionBox,
    Paragraph,
    Stack,
    Text,
    TextField,
} from '@ui'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { axiosClient } from 'api/apiClient'
import { env } from 'utils'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { bufferedLogger } from 'utils/wrappedlogger'
import { useStore } from 'store/store'
import { BetaDebugger } from 'BetaDebugger'
import { useRequestShakePermissions } from '@components/BugReportButton/ShakeToReport'
import { useDevice } from 'hooks/useDevice'
import { PanelButton } from '@components/Panel/PanelButton'

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
    [FormStateKeys.email]: z.union([
        z.literal(''),
        z.string().email('Please enter a valid email address.'),
    ]),
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

    let PWAflag = 'no'

    if (window.matchMedia('(display-mode: standalone)').matches) {
        PWAflag = 'yes'
    }

    let deviceType = ''

    const userAgent = navigator.userAgent.toLowerCase()

    if (userAgent.includes('android')) {
        deviceType = 'Device type: Android'
    } else if (
        userAgent.includes('iphone') ||
        userAgent.includes('ipad') ||
        userAgent.includes('ipod')
    ) {
        deviceType = 'Device type: iOS'
    } else {
        deviceType = 'Device type: Laptop/Desktop'
    }

    data.comments += `\n\nVersion: ${env.VITE_APP_RELEASE_VERSION}`
    data.comments += `\n\nUser Agent:  + ${navigator.userAgent}`
    data.comments += `\n\nDevice Type: ${deviceType}`
    data.comments += `\n\nPWA: ${PWAflag}`
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
                    <ErrorReportForm />
                </ModalContainer>
            )}
        </>
    )
}

export const ErrorReportForm = (props: { onHide?: () => void }) => {
    const { onHide } = props
    const [success, setSuccess] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { mutate: doCustomError, isPending: isLoading } = useMutation({
        mutationFn: postCustomError,
    })
    const { isTouch } = useDevice()

    const { setSidePanel, setBugReportCredentials, bugReportCredentials } = useStore(
        ({ setSidePanel, setBugReportCredentials, bugReportCredentials }) => ({
            setSidePanel,
            setBugReportCredentials,
            bugReportCredentials,
        }),
    )

    const onCancel = useCallback(() => {
        setSidePanel(null)
        onHide?.()
    }, [setSidePanel, onHide])

    const { requestPermission, revokePermission, permissionStatus } = useRequestShakePermissions()
    const onActivateShake = useCallback(() => {
        if (permissionStatus === 'granted') {
            revokePermission()
        } else {
            requestPermission()
        }
    }, [permissionStatus, requestPermission, revokePermission])

    const submitButtonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                const activeElement = document.activeElement
                const isNameFocused = activeElement === document.getElementById('name')
                const isCommentsFocused = activeElement === document.getElementById('comments')
                if (!isLoading && (isNameFocused || isCommentsFocused)) {
                    submitButtonRef.current?.click()
                }
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
        }
    })

    if (success) {
        return (
            <Stack centerContent gap="x4" padding="x4">
                <Text>Thank you for your submission. Our team has been notified.</Text>
                <Button tone="cta1" onClick={onCancel}>
                    Close
                </Button>
            </Stack>
        )
    }

    return (
        <FormRender<FormState>
            grow
            defaultValues={{ ...defaultValues, ...bugReportCredentials }}
            schema={schema}
            id="error-report-form"
            onSubmit={(data) => {
                setBugReportCredentials({ name: data.name, email: data.email })
                doCustomError(data, {
                    onSuccess: () => {
                        setSuccess(true)
                    },
                    onError: (error) => {
                        console.error('Error submitting feedback', error)
                        setErrorMessage(
                            `There was an error while submitting your feedback. Please try again later.`,
                        )
                    },
                })
            }}
        >
            {({ register, formState }) => (
                <Stack gap grow>
                    <MotionBox layout="position">
                        <TextField
                            autoFocus
                            background="level2"
                            placeholder="Name"
                            tone={formState.errors[FormStateKeys.name] ? 'error' : 'neutral'}
                            message={
                                <ErrorMessage
                                    preventSpace
                                    errors={formState.errors}
                                    fieldName={FormStateKeys.name}
                                />
                            }
                            {...register(FormStateKeys.name)}
                        />
                    </MotionBox>
                    <MotionBox layout="position">
                        <TextField
                            background="level2"
                            placeholder="Email (optional)"
                            tone={formState.errors[FormStateKeys.email] ? 'error' : 'neutral'}
                            message={
                                <ErrorMessage
                                    preventSpace
                                    errors={formState.errors}
                                    fieldName={FormStateKeys.email}
                                />
                            }
                            {...register(FormStateKeys.email)}
                        />
                    </MotionBox>
                    <MotionBox layout="position">
                        <TextArea
                            paddingY="md"
                            background="level2"
                            placeholder="Please describe your issue"
                            height="150"
                            maxLength={400}
                            tone={formState.errors[FormStateKeys.comments] ? 'error' : 'neutral'}
                            message={
                                <ErrorMessage
                                    preventSpace
                                    errors={formState.errors}
                                    fieldName={FormStateKeys.comments}
                                />
                            }
                            {...register(FormStateKeys.comments)}
                        />
                    </MotionBox>
                    {isTouch && (
                        <PanelButton onClick={onActivateShake}>
                            <Box width="height_md" alignItems="center">
                                <Icon
                                    type={permissionStatus === 'granted' ? 'shakeOff' : 'shake'}
                                    size="square_sm"
                                />
                            </Box>
                            {permissionStatus === 'granted' ? (
                                <Paragraph color="gray1">Disable Shake to Report</Paragraph>
                            ) : (
                                <Paragraph color="gray1">Enable Shake to Report</Paragraph>
                            )}
                        </PanelButton>
                    )}
                    <DebugInfo />
                    {errorMessage && (
                        <Stack paddingBottom="sm">
                            <Text color="error">{errorMessage}</Text>
                        </Stack>
                    )}

                    <Box grow />
                    <Stack horizontal gap justifyContent="end">
                        <Button
                            grow
                            tone="cta1"
                            type="submit"
                            ref={submitButtonRef}
                            disabled={isLoading}
                        >
                            {isLoading && <ButtonSpinner />}
                            Submit
                        </Button>
                    </Stack>
                </Stack>
            )}
        </FormRender>
    )
}

const DebugInfo = () => {
    const [isDebugInfoOpen, setIsDebugInfoOpen] = useState(true)
    const onToggle = useCallback(() => {
        setIsDebugInfoOpen((v) => !v)
    }, [])
    return (
        <Box elevateReadability borderRadius="sm" overflow="hidden">
            <Box
                horizontal
                height="x6"
                cursor="pointer"
                padding="md"
                background={isDebugInfoOpen ? 'level2' : 'level1'}
                color="gray2"
                alignItems="center"
                gap="sm"
                onClick={onToggle}
            >
                <Icon type="info" size="square_sm" />
                <Text size="sm">Debug information</Text>
            </Box>
            {isDebugInfoOpen && (
                <Box padding>
                    <BetaDebugger />
                </Box>
            )}
        </Box>
    )
}
