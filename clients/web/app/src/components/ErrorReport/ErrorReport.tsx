import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { z } from 'zod'
import { datadogRum } from '@datadog/browser-rum'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast/headless'
import { useShallow } from 'zustand/react/shallow'
import { Controller, UseFormReturn, useWatch } from 'react-hook-form'
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
import { UploadInput } from 'ui/components/Form/Upload'
import { FieldOutline } from 'ui/components/_internal/Field/FieldOutline/FieldOutline'
import { srOnlyClass } from 'ui/styles/globals/utils.css'
import * as fieldStyles from '../../ui/components/_internal/Field/Field.css'
import { BugSubmittedToast } from './BugSubmittedToast'

const FormStateKeys = {
    name: 'name',
    email: 'email',
    comments: 'comments',
    logs: 'logs',
    attachments: 'attachments',
} as const

type FormState = {
    [FormStateKeys.name]: string
    [FormStateKeys.email]: string
    [FormStateKeys.comments]: string
    [FormStateKeys.logs]: string
    [FormStateKeys.attachments]: File[]
}

const schema = z.object({
    [FormStateKeys.name]: z.string().min(1, 'Please enter your name.'),
    [FormStateKeys.email]: z.union([
        z.literal(''),
        z.string().email('Please enter a valid email address.'),
    ]),
    [FormStateKeys.comments]: z.string().min(1, 'Please enter a description.'),
    [FormStateKeys.attachments]: z.array(z.instanceof(File)).optional(),
})

const defaultValues = {
    [FormStateKeys.name]: '',
    [FormStateKeys.email]: '',
    [FormStateKeys.comments]: '',
    [FormStateKeys.attachments]: [],
}

async function postCustomErrorToDatadog(data: FormState, id: string, logs: string) {
    const dataWithoutFile = {
        ...data,
        attachments: data[FormStateKeys.attachments].map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
        })),
    }
    datadogRum.addAction('user-feedback-custom-error', {
        dataWithoutFile,
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

    const uuid = crypto.randomUUID()

    const formData = new FormData()

    formData.append('name', data.name)
    formData.append('email', data.email)
    formData.append('comments', data.comments)
    formData.append('id', uuid)
    formData.append('logs', logs)

    for (const attachment of data.attachments) {
        formData.append(`attachment[]`, attachment)
    }

    const postCustom = await axiosClient.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
    })
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

export const ErrorReportForm = (props: { onHide?: () => void; asSheet?: boolean }) => {
    const { onHide, asSheet } = props
    const inputRef = useRef<HTMLInputElement>(null)
    const [success, setSuccess] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { mutate: doCustomError, isPending: isLoading } = useMutation({
        mutationFn: postCustomError,
    })
    const { isTouch } = useDevice()

    const { setBugReportCredentials, bugReportCredentials } = useStore(
        useShallow(({ setBugReportCredentials, bugReportCredentials }) => ({
            setBugReportCredentials,
            bugReportCredentials,
        })),
    )

    const { requestPermission, revokePermission, enabled } = useRequestShakePermissions()
    const onActivateShake = useCallback(() => {
        if (enabled) {
            revokePermission()
        } else {
            requestPermission()
        }
    }, [enabled, requestPermission, revokePermission])

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
        toast.custom((t) => {
            return (
                <BugSubmittedToast
                    toast={t}
                    message="Thank you for your submission. Our team has been notified."
                />
            )
        })
        onHide?.()
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
                        console.log('[ErrorReport] Feedback submitted successfully')
                    },
                    onError: (error) => {
                        setErrorMessage(
                            `There was an error while submitting your feedback. Please try again later.`,
                        )
                        console.error('[ErrorReport] Error submitting feedback', error)
                    },
                })
            }}
        >
            {(_form) => {
                const form = _form as unknown as UseFormReturn<FormState>
                const { register, control, formState } = form

                return (
                    <>
                        <Stack
                            gap
                            grow
                            scroll={asSheet}
                            scrollbars={asSheet}
                            maxHeight={asSheet ? '50vh' : 'auto'}
                        >
                            <MotionBox layout="position">
                                <TextField
                                    autoFocus
                                    background="level2"
                                    placeholder="Name"
                                    tone={
                                        formState.errors[FormStateKeys.name] ? 'error' : 'neutral'
                                    }
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
                                    tone={
                                        formState.errors[FormStateKeys.email] ? 'error' : 'neutral'
                                    }
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
                                    tone={
                                        formState.errors[FormStateKeys.comments]
                                            ? 'error'
                                            : 'neutral'
                                    }
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

                            <PreviewFiles form={form} />

                            <MotionBox layout="position">
                                <PanelButton
                                    type="button"
                                    onDragEnter={() => {
                                        setIsDragging(true)
                                    }}
                                    onDragOver={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setIsDragging(true)
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault()
                                        setIsDragging(false)
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setIsDragging(false)
                                        const files = Array.from(e.dataTransfer.files)
                                        // dont add duplicates
                                        const newFiles = files.filter(
                                            (f) =>
                                                !form
                                                    .getValues(FormStateKeys.attachments)
                                                    .some((af) => af.name === f.name),
                                        )
                                        if (newFiles.length > 0) {
                                            form.setValue(
                                                FormStateKeys.attachments,
                                                form
                                                    .getValues(FormStateKeys.attachments)
                                                    .concat(newFiles),
                                            )
                                        }
                                    }}
                                    onClick={() => {
                                        inputRef.current?.click()
                                    }}
                                >
                                    <Box width="height_md" alignItems="center">
                                        <Icon type="attachment" size="square_sm" />
                                    </Box>
                                    <Paragraph color="gray1">
                                        {isDragging ? 'Drop file here' : 'Upload a file'}
                                    </Paragraph>

                                    <Controller
                                        control={control}
                                        name={FormStateKeys.attachments}
                                        render={({ field: { value, onChange, name } }) => (
                                            <>
                                                <UploadInput
                                                    className={[fieldStyles.field, srOnlyClass]}
                                                    ref={inputRef}
                                                    name={name}
                                                    register={register}
                                                    onChange={(e) => {
                                                        const file = e.target?.files?.[0]
                                                        if (
                                                            !file ||
                                                            value.some((f) => f.name === file.name)
                                                        ) {
                                                            return onChange(value)
                                                        }
                                                        return onChange([...value, file])
                                                    }}
                                                />
                                                <ErrorMessage
                                                    preventSpace
                                                    errors={formState.errors}
                                                    fieldName={FormStateKeys.attachments}
                                                />
                                                <FieldOutline tone="accent" rounded="sm" />
                                            </>
                                        )}
                                    />
                                </PanelButton>
                            </MotionBox>
                            {isTouch && (
                                <PanelButton type="button" onClick={onActivateShake}>
                                    <Box width="height_md" alignItems="center">
                                        <Icon
                                            type={enabled ? 'shakeOff' : 'shake'}
                                            size="square_sm"
                                        />
                                    </Box>
                                    {enabled ? (
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
                        </Stack>
                        <Stack horizontal gap paddingTop="sm" justifyContent="end">
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
                    </>
                )
            }}
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

const UploadedImage = ({ file, form }: { file: File; form: UseFormReturn<FormState> }) => {
    const imageSrc = useMemo(() => {
        const isImage = file.type.startsWith('image/')
        if (isImage) {
            return URL.createObjectURL(file)
        }
    }, [file])

    return (
        <MotionBox layout="position">
            <Box
                horizontal
                padding
                transition
                height="x6"
                rounded="sm"
                background="level2"
                justifyContent="spaceBetween"
                alignItems="center"
                gap="sm"
            >
                <Box horizontal gap="sm" alignItems="center" overflow="hidden">
                    {imageSrc ? (
                        <Box
                            display="block"
                            as="img"
                            minWidth="x4"
                            square="square_lg"
                            alignItems="center"
                            rounded="sm"
                            objectFit="cover"
                            src={imageSrc}
                        />
                    ) : (
                        <Icon type="attachment" size="square_sm" color="gray2" />
                    )}
                    <Text noWrap truncate color="default">
                        {file.name}
                    </Text>
                </Box>
                <Icon
                    type="close"
                    size="square_xs"
                    color="gray2"
                    cursor="pointer"
                    onClick={() => {
                        form.setValue(
                            FormStateKeys.attachments,
                            form
                                .getValues(FormStateKeys.attachments)
                                .filter((f) => f.name !== file.name),
                        )
                    }}
                />
            </Box>
        </MotionBox>
    )
}

const PreviewFiles = ({ form }: { form: UseFormReturn<FormState> }) => {
    const fields = useWatch({ control: form.control })

    return (
        <>
            {fields[FormStateKeys.attachments]?.map((file: File) => (
                <UploadedImage key={file.name} file={file} form={form} />
            ))}
        </>
    )
}
