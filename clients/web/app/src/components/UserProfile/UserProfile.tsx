import { getAccountAddress, useZionClient } from 'use-zion-client'
import React, { useEffect, useMemo, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { toast } from 'react-hot-toast/headless'
import { Avatar, Box, FormRender, MotionStack, Paragraph, Stack, TextButton, TextField } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { useSetUserBio } from 'hooks/useUserBio'
import { shortAddress } from 'ui/utils/utils'
import { useAuth } from 'hooks/useAuth'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { Spinner } from '@components/Spinner'
import { errorHasInvalidCookieResponseHeader } from 'api/apiClient'
import { InvalidCookieNotification } from '@components/Notifications/InvalidCookieNotification'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { vars } from 'ui/styles/vars.css'
import { transitions } from 'ui/transitions/transitions'

type Props = {
    displayName: string
    userAddress?: string
    center?: boolean
    info?: { title: string; content?: string | JSX.Element }[]
    userBio?: string
    userId?: string
    canEdit?: boolean
}

enum InputId {
    DisplayName = 'DisplayName',
    Bio = 'Bio',
}

export const UserProfile = (props: Props) => {
    const { userId, canEdit, center, displayName, info, userAddress, userBio } = props
    const { loggedInWalletAddress } = useAuth()
    const { setDisplayName } = useZionClient()
    const { mutateAsync: mutateAsyncBio } = useSetUserBio(userAddress)

    const resourceId = useMemo(() => {
        return getAccountAddress(userId ?? '') ?? ''
    }, [userId])

    const onSaveItem = useEvent((id: string, content: undefined | string) => {
        switch (id) {
            case InputId.DisplayName: {
                if (!content || content.length < 3) {
                    throw new Error('Display name must be at least 3 characters')
                }
                if (content.length >= 25) {
                    throw new Error('Display name must have less than 25 characters')
                }
                return setDisplayName(content)
            }
            case InputId.Bio: {
                if (!userAddress) {
                    throw new Error('no user address provided')
                }

                content = content?.trim() ?? ''

                // return new Promise<void>((resolve, reject) => {
                //     setTimeout(() => {
                //         reject(new Error('Debugging something went wrong'))
                //     }, 1000)
                // })

                return mutateAsyncBio(content, {
                    onError: (error) => {
                        if (errorHasInvalidCookieResponseHeader(error)) {
                            toast.custom((t) => (
                                <InvalidCookieNotification
                                    toast={t}
                                    actionMessage="edit the description"
                                />
                            ))
                        }
                    },
                })
            }
        }
    })
    return (
        <Stack grow padding gap position="relative">
            <Stack centerContent={center} padding="lg">
                <FormRender maxWidth="200" width="100%" key={resourceId}>
                    {({ register, formState, setError, clearErrors }) => (
                        <LargeUploadImageTemplate
                            canEdit={Boolean(loggedInWalletAddress === resourceId)}
                            type="avatar"
                            formFieldName="avatar"
                            resourceId={resourceId}
                            setError={setError}
                            register={register}
                            formState={formState}
                            clearErrors={clearErrors}
                            imageRestrictions={{
                                minDimension: {
                                    message: `Image is too small. Please upload an image with a minimum height & width of 300px.`,
                                    min: 300,
                                },
                            }}
                        >
                            <Stack aspectRatio="1/1">
                                <Avatar
                                    userId={userId}
                                    size="avatar_100"
                                    imageVariant="thumbnail300"
                                />
                            </Stack>
                        </LargeUploadImageTemplate>
                    )}
                </FormRender>
            </Stack>
            <Stack grow gap="lg">
                <EditModeContainer
                    inputId={InputId.DisplayName}
                    canEdit={canEdit}
                    initialValue={displayName}
                    onSave={onSaveItem}
                >
                    {({
                        editMenu,
                        value,
                        isEditing,
                        errorComponent,
                        error,
                        handleEdit,
                        onChange,
                        handleSave,
                    }) => (
                        <Stack grow padding gap="sm" background="level2" rounded="sm" width="100%">
                            <MotionStack
                                grow
                                horizontal
                                gap="sm"
                                alignItems="start"
                                minHeight="input_md"
                                insetTop="xs"
                                animate={{
                                    paddingTop: isEditing ? vars.space.sm : ' 0px',
                                    paddingBottom: isEditing ? vars.space.sm : ' 0px',
                                }}
                                transition={transitions.button}
                            >
                                {!isEditing ? (
                                    <Box grow gap="sm" width="100%">
                                        <Box
                                            horizontal
                                            alignItems="center"
                                            gap="xs"
                                            height="x5"
                                            overflow="hidden"
                                            onClick={canEdit && !isEditing ? handleEdit : undefined}
                                        >
                                            <Paragraph truncate strong size="lg" color="default">
                                                {displayName}
                                            </Paragraph>
                                            {/* {canEdit ? (
                                                <Box color="gray2">
                                                    <Icon type="edit" size="square_xs" />
                                                </Box>
                                            ) : (
                                                <></>
                                            )} */}
                                        </Box>
                                        {userAddress && (
                                            <ClipboardCopy
                                                label={shortAddress(userAddress)}
                                                clipboardContent={userAddress}
                                            />
                                        )}
                                    </Box>
                                ) : (
                                    <Box grow horizontal gap>
                                        <Stack grow gap="sm">
                                            <Stack>
                                                <TextField
                                                    autoFocus
                                                    tone={error ? 'error' : undefined}
                                                    style={{ width: 0, minWidth: '100%' }} // shrink hack
                                                    background="level2"
                                                    value={value}
                                                    placeholder="Enter display name..."
                                                    height="x5"
                                                    onChange={onChange}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleSave()
                                                        } else if (e.key === 'Escape') {
                                                            handleEdit()
                                                        }
                                                    }}
                                                />
                                                {errorComponent}
                                            </Stack>
                                            {userAddress && (
                                                <ClipboardCopy
                                                    label={shortAddress(userAddress)}
                                                    clipboardContent={userAddress}
                                                />
                                            )}
                                        </Stack>
                                    </Box>
                                )}
                                <Box height="x5" justifyContent="center">
                                    {editMenu}
                                </Box>
                            </MotionStack>
                        </Stack>
                    )}
                </EditModeContainer>

                <EditModeContainer
                    inputId={InputId.Bio}
                    initialValue={userBio}
                    canEdit={canEdit}
                    onSave={onSaveItem}
                >
                    {({
                        editMenu,
                        value,
                        isEditing,
                        isSaving,
                        error,
                        errorComponent,
                        onChange,
                        handleEdit,
                    }) => {
                        return (
                            <Stack grow padding gap background="level2" rounded="sm">
                                <Stack horizontal>
                                    <Stack
                                        gap
                                        grow
                                        onClick={canEdit && !isEditing ? handleEdit : undefined}
                                    >
                                        <Paragraph strong color="default">
                                            Bio
                                        </Paragraph>
                                    </Stack>
                                    <Box>{editMenu}</Box>
                                </Stack>
                                <Stack gap="sm">
                                    {!isEditing ? (
                                        <Paragraph color="gray2">
                                            {userBio ?? `no biography just yet`}
                                        </Paragraph>
                                    ) : (
                                        <TextArea
                                            autoFocus
                                            key={error ? 'errored' : 'not-errored'}
                                            tone={error ? 'error' : undefined}
                                            paddingY="md"
                                            background="level2"
                                            defaultValue={value}
                                            height="100"
                                            maxLength={160}
                                            disabled={isSaving}
                                            onChange={onChange}
                                        />
                                    )}
                                    {errorComponent}
                                </Stack>
                            </Stack>
                        )
                    }}
                </EditModeContainer>

                {!!info?.length &&
                    info.map((n) => (
                        <>
                            <Paragraph strong>{n.title}</Paragraph>
                            <Paragraph color="gray2">{n.content}</Paragraph>
                        </>
                    ))}
            </Stack>
        </Stack>
    )
}

type EditRowProps = {
    inputId: string
    initialValue: string | undefined
    children: (renderOptions: EditRowRenderProps) => JSX.Element
    onSave: (id: string, content: undefined | string) => Promise<void> | void
    canEdit?: boolean
}

type EditRowRenderProps = {
    editMenu: JSX.Element | undefined
    value: string | undefined
    isEditing: boolean
    isSaving: boolean
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    handleSave: () => void
    handleEdit: () => void
    error: Error | undefined
    errorComponent: JSX.Element | undefined
}

// TODO: refactor
export const EditModeContainer = (props: EditRowProps) => {
    const [value, setValue] = useState<string | undefined>(props.initialValue)
    const [isEditing, setIsEditing] = React.useState(false)
    const [error, setError] = useState<Error | undefined>()

    const handleEdit = useEvent(() => {
        setIsEditing((e) => !e)
    })

    const [isSaving, setIsSaving] = useState(false)

    const handleSave = useEvent(() => {
        const save = async () => {
            setIsSaving(true)
            try {
                await props.onSave(props.inputId, value)
                setIsEditing(false)
            } catch (e: unknown) {
                console.error('error while saving UserProfile', e)
                setError(e as Error)
            }
            setIsSaving(false)
        }

        save()
    })

    useEffect(() => {
        if (!isEditing) {
            setError(undefined)
            setValue(props.initialValue)
        }
    }, [isEditing, props.initialValue])

    useEffect(() => {
        value
        setError(undefined)
    }, [value])

    const onChange = useEvent((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setValue(e.target.value)
    })

    const editMenu = useMemo(
        () =>
            !props.canEdit ? undefined : (
                <Box horizontal gap="sm" shrink={false}>
                    {isSaving ? (
                        <Stack horizontal gap="sm" alignItems="center" color="positive">
                            <Paragraph size="sm">Updating</Paragraph>
                            <Spinner square="square_xxs" />
                        </Stack>
                    ) : (
                        <>
                            <TextButton onClick={handleEdit}>
                                {!isEditing ? 'Edit' : 'Cancel'}
                            </TextButton>
                            {isEditing && (
                                <TextButton color="default" onClick={handleSave}>
                                    Save
                                </TextButton>
                            )}
                        </>
                    )}
                </Box>
            ),
        [handleEdit, handleSave, isEditing, isSaving, props.canEdit],
    )

    const errorComponent = useMemo(() => {
        return error ? (
            <Box paddingY="sm">
                <Paragraph color="error" size="sm">
                    {error?.message}
                </Paragraph>
            </Box>
        ) : undefined
    }, [error])

    return (
        <>
            <Stack
                horizontal
                justifyContent="spaceBetween"
                alignItems="baseline"
                position="relative"
            >
                {props.children({
                    editMenu,
                    isEditing,
                    isSaving,
                    onChange,
                    handleSave,
                    handleEdit,
                    errorComponent,
                    error,
                    value,
                })}
            </Stack>
        </>
    )
}
