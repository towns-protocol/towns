import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Box, FormRender, IconButton, MotionBox, Stack, Text, TextField } from '@ui'
import { BlurredBackground } from '@components/TouchLayoutHeader/BlurredBackground'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { TEMPORARY_SPACE_ICON_URL } from '@components/Web3/CreateSpaceForm/constants'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { UploadImageRequestConfig } from 'api/lib/uploadImage'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { CreateSpaceFormV2SchemaType, schema } from './CreateSpaceFormV2.schema'

export function CreateSpaceFormV2() {
    const nameRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        nameRef.current?.focus()
    }, [])

    return (
        <Stack horizontal grow borderTop position="relative">
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
                            />
                            <Box alignItems="start" paddingLeft="md" gap="sm">
                                <FormFieldEdit label="By">
                                    <>
                                        <Text strong>Brian.eth</Text>
                                    </>
                                </FormFieldEdit>

                                <FormFieldEdit label="For">
                                    <>
                                        <Text strong>Anyone</Text>
                                    </>
                                </FormFieldEdit>

                                <FormFieldEdit label="Membership">
                                    <>
                                        <Text strong>1000 * Free</Text>
                                    </>
                                </FormFieldEdit>
                            </Box>
                            <TextArea
                                maxWidth="420"
                                paddingY="md"
                                placeholder="Add town bio"
                                tone="none"
                            />
                        </Stack>
                    )
                }}
            </FormRender>
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
            <Text>{label}</Text>
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
