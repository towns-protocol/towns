import React from 'react'
import { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { Box, BoxProps, ErrorMessage, Icon, Text } from '@ui'
import { Spinner } from '@components/Spinner'
import { vars } from 'ui/styles/vars.css'
import { UploadInput } from 'ui/components/Form/Upload'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { srOnlyClass } from 'ui/styles/globals/utils.css'
import { FieldOutline } from 'ui/components/_internal/Field/FieldOutline/FieldOutline'
import { loadingStyles, spinnerStyles } from './UploadImage.css'
import { UseOnImageChangeEventProps, useOnImageChangeEvent } from './useOnImageChangeEvent'

type Props<T extends FieldValues> = {
    children: React.ReactNode
    canEdit: boolean
    resourceId: string
    formFieldName: Path<T>
    type: UseOnImageChangeEventProps<T>['type']
    imageRestrictions?: UseOnImageChangeEventProps<T>['imageRestrictions']
    overrideUploadCb?: UseOnImageChangeEventProps<T>['overrideUploadCb']
    uploadIconPosition?: BoxProps['position']
} & Pick<UseFormReturn<T>, 'setError' | 'clearErrors' | 'formState' | 'register'>

const config: BoxProps = {
    width: '200',
    height: '200',
    rounded: 'md',
}

export const LargeUploadImageTemplate = <T extends FieldValues>(props: Props<T>) => {
    const {
        children,
        canEdit,
        formFieldName,
        type,
        resourceId,
        imageRestrictions,
        register,
        formState,
        setError,
        clearErrors,
        overrideUploadCb,
        uploadIconPosition = 'topRight',
    } = props

    const { onChange, isLoading } = useOnImageChangeEvent({
        overrideUploadCb,
        resourceId,
        type,
        imageRestrictions,
        formFieldName,
        setError,
        clearErrors,
        formState,
    })

    const ref = React.useRef<HTMLInputElement>(null)

    function onClick() {
        if (isLoading) {
            return
        }
        ref.current?.click()
    }

    return (
        <Box position="relative" data-testid="upload-image-container">
            <Box className={isLoading ? loadingStyles : ''}>{children}</Box>

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
                    <Box position={uploadIconPosition} padding="md">
                        <Box
                            centerContent
                            disabled={isLoading}
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
                                type="camera"
                                size="square_sm"
                                style={{
                                    color: vars.color.foreground.gray2,
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
                            name={formFieldName}
                            className={[fieldStyles.field, srOnlyClass]}
                            ref={ref}
                            register={register}
                            accept="image/*"
                            onChange={onChange}
                        />
                        <FieldOutline tone="accent" rounded="md" />
                    </Box>
                    {formState?.errors[formFieldName] && (
                        <Box centerContent padding width="100%">
                            <ErrorMessage
                                maxWidth="200"
                                textProps={{
                                    textAlign: 'center',
                                }}
                                errors={formState.errors}
                                fieldName={formFieldName}
                            />
                        </Box>
                    )}
                </>
            )}
        </Box>
    )
}
