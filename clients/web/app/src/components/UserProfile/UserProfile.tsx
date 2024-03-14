import { useSpaceData, useUserLookupContext } from 'use-towns-client'
import React, { useEffect, useMemo, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { toast } from 'react-hot-toast/headless'
import { Box, FormRender, Paragraph, Stack, Text, TextButton } from '@ui'
import { useSetUserBio } from 'hooks/useUserBio'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { Spinner } from '@components/Spinner'
import { errorHasInvalidCookieResponseHeader } from 'api/apiClient'
import { InvalidCookieNotification } from '@components/Notifications/InvalidCookieNotification'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { Avatar } from '@components/Avatar/Avatar'
import { SetUsernameDisplayName } from '@components/SetUsernameDisplayName/SetUsernameDisplayName'
import { MutualTowns } from '@components/MutualTowns/MutualTowns'
import { UserWalletContent } from './UserWalletContent'

type Props = {
    displayName: string
    center?: boolean
    info?: { title: string; content?: string | JSX.Element }[]
    userBio?: string
    userId?: string
    canEdit?: boolean
    abstractAccountAddress?: string
}

enum InputId {
    Bio = 'Bio',
}

export const UserProfile = (props: Props) => {
    const { userId, canEdit, center, info, userBio, abstractAccountAddress } = props
    const spaceData = useSpaceData()
    const { usersMap } = useUserLookupContext()
    const user = userId ? usersMap[userId] : undefined

    const { mutateAsync: mutateAsyncBio } = useSetUserBio(abstractAccountAddress)

    const resourceId = useMemo(() => {
        return abstractAccountAddress ?? ''
    }, [abstractAccountAddress])

    const onSaveItem = useEvent((id: string, content: undefined | string) => {
        switch (id) {
            case InputId.Bio: {
                if (!abstractAccountAddress) {
                    throw new Error('no user address provided')
                }

                content = content?.trim() ?? ''

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
        <Stack grow gap paddingBottom="none" position="relative">
            <Stack centerContent={center} padding="lg">
                <FormRender maxWidth="200" width="100%" key={resourceId}>
                    {({ register, formState, setError, clearErrors }) => (
                        <LargeUploadImageTemplate
                            canEdit={!!canEdit}
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
                            <Stack centerContent aspectRatio="1/1">
                                <Avatar
                                    userId={userId}
                                    size="avatar_x20"
                                    imageVariant="thumbnail300"
                                />
                            </Stack>
                        </LargeUploadImageTemplate>
                    )}
                </FormRender>
            </Stack>

            {canEdit ? (
                <>
                    {spaceData && (
                        <SetUsernameDisplayName
                            titleProperties={{ kind: 'space', spaceName: spaceData.name }}
                        />
                    )}
                </>
            ) : (
                <Stack padding gap rounded="sm" background="level2">
                    {user && (
                        <>
                            {user.displayName.length > 0 && (
                                <Text color="default" fontSize="lg" fontWeight="strong">
                                    {user.displayName}
                                </Text>
                            )}
                            <Text color="default">@{user.username}</Text>
                        </>
                    )}
                    <UserWalletContent abstractAccountAddress={abstractAccountAddress} />
                </Stack>
            )}

            {user && (
                <Stack
                    horizontal
                    gap
                    paddingY="sm"
                    paddingX="lg"
                    background="level2"
                    rounded="sm"
                    alignItems="center"
                >
                    <MutualTowns user={user} />
                </Stack>
            )}

            {(canEdit || (userBio && userBio !== '')) && (
                <Stack grow gap>
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
            )}
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
