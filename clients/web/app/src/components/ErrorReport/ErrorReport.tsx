import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast/headless'
import { useShallow } from 'zustand/react/shallow'
import { Controller, UseFormReturn } from 'react-hook-form'
import { useConnectivity } from 'use-towns-client'
import { ModalContainer } from '@components/Modals/ModalContainer'
import {
    Box,
    ErrorMessage,
    FancyButton,
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
import { bufferedLogger } from 'utils/wrappedlogger'
import { useStore } from 'store/store'
import { BetaDebugger } from 'BetaDebugger'
import { useRequestShakePermissions } from '@components/BugReportButton/ShakeToReport'
import { getBrowserName, useDevice } from 'hooks/useDevice'
import { PanelButton } from '@components/Panel/PanelButton'
import { UploadInput } from 'ui/components/Form/Upload'
import { FieldOutline } from 'ui/components/_internal/Field/FieldOutline/FieldOutline'
import { srOnlyClass } from 'ui/styles/globals/utils.css'
import {
    FileDropContextProvider,
    useFileDropContext,
} from '@components/FileDropContext/FileDropContext'
import { Analytics } from 'hooks/useAnalytics'
import { useConnectionStatus } from '@components/NodeConnectionStatusPanel/hooks/useConnectionStatus'
import { NodeData, useNodeData } from '@components/NodeConnectionStatusPanel/hooks/useNodeData'
import { getNodeStatusFromNodeData } from '@components/NodeConnectionStatusPanel/NodeStatusPill'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
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
    [FormStateKeys.comments]: z
        .string()
        .min(20, 'Please enter a description that is at least 20 characters long.'),
    [FormStateKeys.attachments]: z.array(z.instanceof(File)).optional(),
})

const defaultValues = {
    [FormStateKeys.name]: '',
    [FormStateKeys.email]: '',
    [FormStateKeys.comments]: '',
    [FormStateKeys.attachments]: [],
}

async function postCustomError(
    data: FormState,
    info: {
        connectionStatus: string
        nodeUrl: string | undefined
        nodeConnections: NodeData[]
        loggedInWalletAddress: string | undefined
        abstractAccountAddress: string | undefined
    },
) {
    Analytics.getInstance().track('submitting bug report')

    const ENV = env.VITE_RIVER_ENV ?? 'localhost'
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
    const location = window.location.href

    if (userAgent.includes('android')) {
        deviceType = 'Android'
    } else if (
        userAgent.includes('iphone') ||
        userAgent.includes('ipad') ||
        userAgent.includes('ipod')
    ) {
        deviceType = 'iOS'
    } else {
        deviceType = 'Laptop/Desktop'
    }

    let deviceInfo = `\n* Version: ${VITE_APP_VERSION}\n`
    deviceInfo += `* Release Hash: ${VITE_APP_COMMIT_HASH}\n`
    deviceInfo += `* Release Date: ${new Date(VITE_APP_TIMESTAMP).toLocaleDateString()}\n`
    deviceInfo += `* Browser: ${getBrowserName() ?? navigator.userAgent}\n`
    deviceInfo += `* Device Type: ${deviceType}\n`
    deviceInfo += `* PWA: ${PWAflag}\n`
    deviceInfo += `* Location: ${location}\n`
    deviceInfo += `* Logged In Wallet Address: ${info.loggedInWalletAddress ?? 'undefined'}\n`
    deviceInfo += `* Abstract Account Address: ${info.abstractAccountAddress ?? 'undefined'}\n`
    deviceInfo += `* Node Connection Status: ${info.connectionStatus}\n`
    deviceInfo += `* Node URL: ${info.nodeUrl ?? 'undefined'}\n`
    deviceInfo += `* Node Connections:\n ${info.nodeConnections
        .map((x) => {
            const status = getNodeStatusFromNodeData(x)
            return `${x.nodeUrl}: ${status.nodeStatus.statusText}/${status.responseStatus}`
        })
        .join('\n')}
    `

    const uuid = crypto.randomUUID()

    const formData = new FormData()
    formData.append('env', ENV)
    formData.append('name', data.name)
    formData.append('email', data.email)
    formData.append('version', VITE_APP_VERSION)
    formData.append('commitHash', VITE_APP_COMMIT_HASH)
    formData.append('deviceInfo', deviceInfo)
    formData.append('comments', data.comments)
    formData.append('id', uuid)
    formData.append('logs', logs)

    for (const attachment of data.attachments) {
        formData.append(`attachment[]`, attachment)
    }

    return axiosClient.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
    })
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

export const ErrorReportForm = (props: { onHide?: () => void; excludeDebugInfo?: boolean }) => {
    const { onHide, excludeDebugInfo } = props
    return (
        <FileDropContextProvider title="Attach a file">
            <_ErrorReportForm excludeDebugInfo={excludeDebugInfo} onHide={onHide} />
        </FileDropContextProvider>
    )
}

const _ErrorReportForm = (props: { onHide?: () => void; excludeDebugInfo?: boolean }) => {
    const { onHide, excludeDebugInfo } = props
    const inputRef = useRef<HTMLInputElement>(null)
    const [success, setSuccess] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const { connectionStatus, nodeUrl } = useConnectionStatus()
    const nodeConnections = useNodeData(nodeUrl)
    const { loggedInWalletAddress } = useConnectivity()
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const doPostCustomError = useCallback(
        (result: FormState) => {
            return postCustomError(result, {
                connectionStatus,
                nodeUrl,
                nodeConnections,
                loggedInWalletAddress,
                abstractAccountAddress,
            })
        },
        [connectionStatus, nodeUrl, nodeConnections, loggedInWalletAddress, abstractAccountAddress],
    )

    const { mutate: doCustomError, isPending: isLoading } = useMutation({
        mutationFn: doPostCustomError,
        retry: 4, // retry N times
        retryDelay: (attempt) => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 8 * 1000), // exponential backoff
    })
    const { addFiles } = useFileDropContext()
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
        Analytics.getInstance().track('submitted bug report')
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
                setErrorMessage('')
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
                        console.error('[ErrorReport] Error submitting feedback', 'error', error)
                    },
                })
            }}
        >
            {(_form) => {
                const form = _form as unknown as UseFormReturn<FormState>
                const { register, control, formState } = form

                return (
                    <>
                        <SyncFormFiles form={form} />
                        <Stack>
                            <Box gap>
                                <MotionBox layout="position">
                                    <TextField
                                        autoFocus
                                        background="level2"
                                        placeholder="Name"
                                        tone={
                                            formState.errors[FormStateKeys.name]
                                                ? 'error'
                                                : 'neutral'
                                        }
                                        message={
                                            <ErrorMessage
                                                preventSpace
                                                errors={formState.errors}
                                                fieldName={FormStateKeys.name}
                                            />
                                        }
                                        data-testid="bug-report-name-input"
                                        {...register(FormStateKeys.name)}
                                    />
                                </MotionBox>
                                <MotionBox layout="position">
                                    <TextField
                                        background="level2"
                                        placeholder="Email (optional)"
                                        tone={
                                            formState.errors[FormStateKeys.email]
                                                ? 'error'
                                                : 'neutral'
                                        }
                                        message={
                                            <ErrorMessage
                                                preventSpace
                                                errors={formState.errors}
                                                fieldName={FormStateKeys.email}
                                            />
                                        }
                                        data-testid="bug-report-email-input"
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
                                        data-testid="bug-report-description-textarea"
                                        onPaste={(e) => {
                                            const files = Array.from(e.clipboardData?.files ?? [])
                                            addFiles(files)
                                        }}
                                        {...register(FormStateKeys.comments)}
                                    />
                                </MotionBox>

                                <PreviewFiles />

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
                                                        dataTestId="bug-report-file-upload"
                                                        onChange={(e) => {
                                                            addFiles(
                                                                Array.from(e.target.files ?? []),
                                                            )
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
                                            <Paragraph color="gray1">
                                                Disable Shake to Report
                                            </Paragraph>
                                        ) : (
                                            <Paragraph color="gray1">
                                                Enable Shake to Report
                                            </Paragraph>
                                        )}
                                    </PanelButton>
                                )}
                                {!excludeDebugInfo && <DebugInfo />}
                                {errorMessage && (
                                    <Stack paddingBottom="sm">
                                        <Text color="error">{errorMessage}</Text>
                                    </Stack>
                                )}
                                <Box height="x8" />
                            </Box>
                        </Stack>

                        <Box
                            padding
                            paddingTop="sm"
                            position="bottomLeft"
                            width="100%"
                            background="backdropBlur"
                        >
                            <FancyButton
                                cta
                                type="submit"
                                ref={submitButtonRef}
                                disabled={isLoading}
                                spinner={isLoading}
                                width="100%"
                                data-testid="bug-report-submit-button"
                            >
                                Submit
                            </FancyButton>
                        </Box>
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

const UploadedImage = ({ file, index }: { file: File; index: number }) => {
    const { removeFile } = useFileDropContext()

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
                    onClick={() => removeFile(index)}
                />
            </Box>
        </MotionBox>
    )
}

const SyncFormFiles = ({ form }: { form: UseFormReturn<FormState> }) => {
    const { files } = useFileDropContext()
    useEffect(() => {
        form.setValue(FormStateKeys.attachments, files)
    }, [files, form])
    return null
}

const PreviewFiles = () => {
    const { files } = useFileDropContext()

    return (
        <>
            {files.map((file: File, index) => (
                <UploadedImage key={file.name} file={file} index={index} />
            ))}
        </>
    )
}
