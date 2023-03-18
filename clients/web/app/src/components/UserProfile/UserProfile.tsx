import React, { useEffect, useMemo, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { useZionClient } from 'use-zion-client'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { BackgroundImage, Box, Paragraph, Stack, TextField } from '@ui'
import { useSetUserBio } from 'hooks/useUserBio'
import { shortAddress } from 'ui/utils/utils'

type Props = {
    avatarUrl?: string
    displayName: string
    userAddress?: string
    center?: boolean
    info?: { title: string; content?: string | JSX.Element }[]
    userBio?: string
    canEdit?: boolean
}

enum InputId {
    DisplayName = 'DisplayName',
    Bio = 'Bio',
}

export const UserProfile = (props: Props) => {
    const { avatarUrl, canEdit, center, displayName, info, userAddress, userBio } = props
    const { setDisplayName } = useZionClient()

    const { mutate, isLoading } = useSetUserBio(userAddress)

    useEffect(() => {
        // TODO: implement loader
        console.log(`UserProfile - isLoading: ${isLoading}`)
    }, [isLoading])

    const onSaveItem = useEvent((id: string, content: undefined | string) => {
        switch (id) {
            case InputId.Bio: {
                if (!userAddress) {
                    throw new Error('no user address provided')
                }
                content = content?.trim() ?? ''
                mutate(content, {
                    onSuccess: async () => {
                        // TODO: loader
                        console.log(`UserProfile - bio updated!`)
                    },
                    onError: () => {
                        // TODO: implement error handling
                        console.error(`UserProfile - bio update failed!`)
                    },
                })
                break
            }
            case InputId.DisplayName: {
                if (content && content?.length > 0 && content?.length < 25) {
                    setDisplayName(content)
                }
                break
            }
        }
    })
    return (
        <Stack grow padding gap position="relative">
            <Stack centerContent={center} padding="lg">
                <Stack
                    width="100%"
                    aspectRatio="1/1"
                    rounded="full"
                    overflow="hidden"
                    maxWidth="200"
                >
                    <BackgroundImage src={avatarUrl} size="cover" />
                </Stack>
            </Stack>
            <Stack grow gap="lg">
                <EditRow
                    inputId={InputId.DisplayName}
                    canEdit={canEdit}
                    initialValue={displayName}
                    onSave={onSaveItem}
                >
                    {({ editMenu, value, isEditing, handleEdit, onChange }) => (
                        <Stack grow horizontal gap alignItems="center" height="input_md">
                            {!isEditing ? (
                                <Box grow gap>
                                    <Box onClick={canEdit && !isEditing ? handleEdit : undefined}>
                                        <Paragraph strong size="lg">
                                            {displayName}
                                        </Paragraph>
                                    </Box>
                                    {userAddress && (
                                        <ClipboardCopy
                                            label={shortAddress(userAddress)}
                                            clipboardContent={userAddress}
                                        />
                                    )}
                                </Box>
                            ) : (
                                <TextField
                                    autoFocus
                                    background="level2"
                                    value={value}
                                    placeholder="Enter display name..."
                                    onChange={onChange}
                                />
                            )}
                            {editMenu}
                        </Stack>
                    )}
                </EditRow>

                <EditRow
                    inputId={InputId.Bio}
                    initialValue={userBio}
                    canEdit={canEdit}
                    onSave={onSaveItem}
                >
                    {({ editMenu, value, isEditing, handleSave, onChange, handleEdit }) => {
                        return (
                            <>
                                <Box position="topRight">{editMenu}</Box>
                                <Stack
                                    gap
                                    grow
                                    onClick={canEdit && !isEditing ? handleEdit : undefined}
                                >
                                    <Paragraph strong>Bio</Paragraph>
                                    {!isEditing ? (
                                        <Paragraph color="gray2">
                                            {userBio ?? `no biography just yet`}
                                        </Paragraph>
                                    ) : (
                                        <TextField
                                            autoFocus
                                            background="level2"
                                            value={value}
                                            placeholder="Enter bio..."
                                            onChange={onChange}
                                        />
                                    )}
                                </Stack>
                            </>
                        )
                    }}
                </EditRow>

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
    inputId: InputId
    initialValue: string | undefined
    children: (renderOptions: EditRowRenderProps) => JSX.Element
    onSave: (id: string, content: undefined | string) => void
    canEdit?: boolean
}

type EditRowRenderProps = {
    editMenu: JSX.Element | undefined
    value: string | undefined
    isEditing: boolean
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleSave: () => void
    handleEdit: () => void
}

const EditRow = (props: EditRowProps) => {
    const [value, setValue] = useState<string | undefined>(props.initialValue)
    const [isEditing, setIsEditing] = React.useState(false)

    const handleEdit = useEvent(() => {
        setIsEditing((e) => !e)
    })

    const handleSave = useEvent(() => {
        props.onSave(props.inputId, value)
        setIsEditing(false)
    })

    const onChange = useEvent((e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value)
    })

    const hasChanged = props.initialValue !== value

    const editMenu = useMemo(
        () =>
            !props.canEdit ? undefined : (
                <Box horizontal gap>
                    <Box
                        cursor="pointer"
                        color={{ default: 'gray2', hover: 'default' }}
                        onClick={handleEdit}
                    >
                        <Paragraph size="sm">{!isEditing ? 'Edit' : 'Cancel'}</Paragraph>
                    </Box>
                    {isEditing && (
                        <Box
                            color={{ default: hasChanged ? 'default' : 'gray2' }}
                            cursor="pointer"
                            onClick={handleSave}
                        >
                            <Paragraph size="sm">Save</Paragraph>
                        </Box>
                    )}
                </Box>
            ),
        [handleEdit, handleSave, hasChanged, isEditing, props.canEdit],
    )

    return (
        <Stack horizontal justifyContent="spaceBetween" alignItems="baseline" position="relative">
            {props.children({ editMenu, isEditing, onChange, handleSave, handleEdit, value })}
        </Stack>
    )
}
