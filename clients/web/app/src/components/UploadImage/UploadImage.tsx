import React, { ChangeEvent, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'

import { Box, BoxProps } from 'ui/components/Box/Box'
import { srOnlyClass } from 'ui/styles/globals/utils.css'
import { UploadInput } from 'ui/components/Form/Upload'
import { FormRender, Icon, Text } from '@ui'
import { FieldOutline } from 'ui/components/_internal/Field/FieldOutline/FieldOutline'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { vars } from 'ui/styles/vars.css'
import { useSpaceIconUpload } from 'api/lib/spaceIcon'
import { Spinner } from '@components/Spinner'
import { loadingStyles, spinnerStyles } from './UploadImage.css'

async function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = reject
        img.src = src
    })
}

const MIN_DIMENSION = 400
const MAX_SIZE = 5000000

type Props = {
    spaceId: string
    spaceName: string
    canEdit: boolean
    spaceAddress?: string
} & Partial<UseFormReturn>

const config: BoxProps = {
    width: '200',
    height: '200',
    rounded: 'md',
}

const FORM_FIELD_NAME = 'spaceIconUpload'

export const UploadImage = (props: Props) => {
    const { setError, register, clearErrors, spaceId, canEdit } = props
    const ref = React.useRef<HTMLInputElement>(null)
    const _spaceId = useMemo(() => spaceId, [spaceId])

    const { mutate: upload, isLoading } = useSpaceIconUpload(spaceId)
    const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(null)

    async function onChange(e: ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (files && files.length > 0) {
            const url = URL.createObjectURL(files[0])
            const { width, height } = await getImageDimensions(url)
            clearErrors?.([FORM_FIELD_NAME])

            if (files[0].size > MAX_SIZE) {
                setError?.(FORM_FIELD_NAME, {
                    type: 'required',
                    message: 'Upload an image less than 5MB',
                })
                return
            }

            if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
                setError?.(FORM_FIELD_NAME, {
                    type: 'required',
                    message: `Image is too small. Please upload an image with a minimum height & width of ${MIN_DIMENSION}px.`,
                })
                return
            }

            upload(
                { id: _spaceId, file: files[0] },
                {
                    onSuccess: () => {
                        setFeedbackMessage(
                            'Image uploaded successfully. It may take a few minutes before you see changes.',
                        )
                    },
                    onError: () => {
                        setFeedbackMessage(
                            'There was an error uploading your image. Please try again.',
                        )
                    },
                },
            )
        }
    }

    function onClick() {
        ref.current?.click()
    }

    return (
        <Box position="relative" data-testid="upload-image-container">
            <Box className={isLoading ? loadingStyles : ''}>
                <InteractiveSpaceIcon
                    spaceId={_spaceId}
                    size="lg"
                    spaceName={props.spaceName}
                    address={props.spaceAddress}
                />
            </Box>

            {isLoading && (
                <>
                    <Box className={spinnerStyles}>
                        <Spinner />
                        <Box>
                            <Text size="sm">Uploading Image</Text>
                        </Box>
                    </Box>
                </>
            )}

            {canEdit && (
                <>
                    <Box position="topRight" padding="md">
                        <Box
                            centerContent
                            data-testid="upload-image-button"
                            role="button"
                            top="xs"
                            right="xs"
                            background="level3"
                            width="x4"
                            height="x4"
                            rounded="full"
                            border="strongLevel1"
                            padding="md"
                            cursor="pointer"
                            onClick={onClick}
                        >
                            <Icon
                                type="edit"
                                size="square_sm"
                                style={{
                                    color: vars.color.layer.level4,
                                }}
                            />
                        </Box>
                    </Box>
                    <Box
                        {...config}
                        centerContent
                        absoluteFill
                        justifySelf="center"
                        alignSelf="center"
                        pointerEvents="none"
                    >
                        <UploadInput
                            name={FORM_FIELD_NAME}
                            className={[fieldStyles.field, srOnlyClass]}
                            ref={ref}
                            register={register}
                            accept="image/*"
                            onChange={onChange}
                        />
                        <FieldOutline tone="accent" rounded="md" />
                    </Box>
                    {feedbackMessage && (
                        <Box centerContent padding width="100%">
                            <Text textAlign="center" size="sm">
                                {feedbackMessage}
                            </Text>
                        </Box>
                    )}
                </>
            )}
        </Box>
    )
}

export const UploadImageDebugger = () => {
    const [spaceId, setSpaceId] = React.useState<string>(
        window.localStorage.getItem('TEST_SPACE_ID') ?? '',
    )

    function onChange(e: ChangeEvent<HTMLInputElement>) {
        const spaceId = e.target.value
        window.localStorage.setItem('TEST_SPACE_ID', spaceId)
        setSpaceId(spaceId)
    }

    return (
        <>
            <h2>Space Id</h2>
            <input type="text" value={spaceId} onChange={onChange} />
            <FormRender onSubmit={() => undefined}>
                {(props) => (
                    <>
                        <UploadImage {...props} canEdit spaceId={spaceId} spaceName="Test space" />
                    </>
                )}
            </FormRender>
        </>
    )
}
