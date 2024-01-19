import React from 'react'
import { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { Box, BoxProps, ErrorMessage, Icon, IconProps, Text } from '@ui'
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
    uploadIconSize?: IconProps['size']
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
        uploadIconSize = 'square_sm',
        uploadIconPosition = 'topRight',
    } = props

    const { onChange, isPending } = useOnImageChangeEvent({
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
        if (isPending) {
            return
        }
        ref.current?.click()
    }

    const imageAreaIsClickable = uploadIconPosition === 'absoluteCenter'

    return (
        <Box position="relative" data-testid="upload-image-container">
            <Box
                className={isPending ? loadingStyles : ''}
                onClick={imageAreaIsClickable ? onClick : void 0}
            >
                {children}
            </Box>

            {isPending && (
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
                    <Box
                        {...config}
                        centerContent
                        position="absoluteCenter"
                        background={imageAreaIsClickable ? 'level2' : 'none'}
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
                    <Box position={uploadIconPosition} padding="md">
                        <Box
                            centerContent
                            disabled={isPending}
                            data-testid="upload-image-button"
                            role="button"
                            top="xs"
                            right="xs"
                            background={imageAreaIsClickable ? 'level2' : 'level3'}
                            width="x4"
                            height="x4"
                            rounded="full"
                            border={imageAreaIsClickable ? 'none' : 'strongLevel1'}
                            padding="md"
                            cursor="pointer"
                            onClick={onClick}
                        >
                            <Icon
                                type="camera"
                                size={uploadIconSize}
                                style={{
                                    color: vars.color.foreground.gray2,
                                }}
                            />
                        </Box>
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
