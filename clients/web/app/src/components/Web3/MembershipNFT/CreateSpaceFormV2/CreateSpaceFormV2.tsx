import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMyProfile } from 'use-zion-client'
import { Box, FormRender, Grid, IconButton, MotionBox, Stack, Text, TextField } from '@ui'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { TEMPORARY_SPACE_ICON_URL } from '@components/Web3/CreateSpaceForm/constants'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { UploadImageRequestConfig } from 'api/lib/uploadImage'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { useAuth } from 'hooks/useAuth'
import { AvatarTextHorizontal } from 'ui/components/Avatar/AvatarTextHorizontal'
import { shortAddress } from 'ui/utils/utils'
import { CreateSpaceFormV2SchemaType, schema } from './CreateSpaceFormV2.schema'
import { AvatarPlaceholder } from '../AvatarPlaceholder'

export function CreateSpaceFormV2() {
    const nameRef = useRef<HTMLInputElement>(null)
    const { loggedInWalletAddress } = useAuth()
    const displayName = shortAddress(useMyProfile()?.displayName ?? '')

    useEffect(() => {
        nameRef.current?.focus()
    }, [])

    const members = [
        {
            address: loggedInWalletAddress,
            displayName,
        },
        ...Array.from({ length: 19 }).map(() => ({
            address: undefined,
        })),
    ]

    return (
        <Stack horizontal grow borderTop position="relative">
            <Stack grow centerContent>
                <FormRender id="CreateSpaceFormV2" schema={schema} mode="onChange" display="block">
                    {({ register, formState, setError, clearErrors }) => {
                        return (
                            <Stack>
                                <div>
                                    <BackgroundImageUpdater />
                                </div>
                                <TextField
                                    paddingY="md"
                                    ref={nameRef}
                                    style={{
                                        fontFamily: 'TitleFont',
                                        textTransform: 'uppercase',
                                    }}
                                    fontSize="h1"
                                    placeholder="town name"
                                    tone="none"
                                    maxWidth="500"
                                />
                                <Box alignItems="start" paddingLeft="md" gap="sm">
                                    <FormFieldEdit label="By">
                                        <>
                                            {loggedInWalletAddress && (
                                                <AvatarTextHorizontal
                                                    address={loggedInWalletAddress}
                                                    name={displayName ?? ''}
                                                />
                                            )}
                                        </>
                                    </FormFieldEdit>

                                    <FormFieldEdit label="For">
                                        <>
                                            <Text strong size="lg">
                                                Anyone
                                            </Text>
                                        </>
                                    </FormFieldEdit>

                                    <FormFieldEdit label="Membership">
                                        <>
                                            <Text strong size="lg">
                                                1000 * Free
                                            </Text>
                                        </>
                                    </FormFieldEdit>
                                </Box>
                                <TextArea
                                    maxWidth="420"
                                    paddingY="md"
                                    placeholder="Add town bio"
                                    tone="none"
                                    fontSize="lg"
                                />
                            </Stack>
                        )
                    }}
                </FormRender>
            </Stack>

            <Stack grow centerContent>
                <Stack width="500" maxWidth="500">
                    <Grid columnMinSize="80px">
                        {members.map((member, idx) => (
                            <Stack
                                paddingBottom="sm"
                                key={`member_${member.address ? member.address : idx}`}
                            >
                                <AvatarPlaceholder member={member} />
                            </Stack>
                        ))}
                    </Grid>
                </Stack>
            </Stack>
        </Stack>
    )
}

function BackgroundImageUpdater() {
    const { register, formState, setError, clearErrors, setValue, watch } =
        useForm<CreateSpaceFormV2SchemaType>()

    const rawImageSrc = watch('spaceIconUrl')
    // b/c it's a FileList before upload
    const imageSrc = typeof rawImageSrc === 'string' ? rawImageSrc : undefined

    const onUpload = useCallback(
        ({ imageUrl, file, id }: Omit<UploadImageRequestConfig, 'type'>) => {
            // set resource on image store so the image updates in the upload component
            const { setLoadedResource } = useImageStore.getState()

            setLoadedResource(id, {
                imageUrl,
            })
            // TODO: save to form values
            setValue('spaceIconUrl', imageUrl)
        },
        [setValue],
    )

    return (
        <Box display="inline-block">
            <BlurredBackground imageSrc={imageSrc ?? ''} blur={40} />
            <LargeUploadImageTemplate<CreateSpaceFormV2SchemaType>
                canEdit
                type="spaceIcon"
                formFieldName="spaceIconUrl"
                resourceId={TEMPORARY_SPACE_ICON_URL}
                setError={setError}
                register={register}
                formState={formState}
                clearErrors={clearErrors}
                overrideUploadCb={onUpload}
                uploadIconSize="square_md"
                uploadIconPosition={imageSrc ? 'topRight' : 'absoluteCenter'}
            >
                <InteractiveTownsToken
                    mintMode
                    key={imageSrc}
                    size="xl"
                    address="address"
                    imageSrc={imageSrc ?? undefined}
                />
            </LargeUploadImageTemplate>
        </Box>
    )
}

function FormFieldEdit({ label, children }: { label: string; children: React.ReactNode }) {
    const [hovered, setHovered] = useState(false)
    return (
        <Box
            horizontal
            centerContent
            gap="sm"
            cursor="pointer"
            display="inline-flex"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Text color="gray2" size="lg">
                {label}
            </Text>
            {children}
            <MotionBox
                animate={{
                    opacity: hovered ? 1 : 0,
                }}
            >
                <IconButton icon="edit" />
            </MotionBox>
        </Box>
    )
}
