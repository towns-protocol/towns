import React from 'react'
import { FieldErrors, FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { useImageStore } from 'use-towns-client'
import { UploadInput } from 'ui/components/Form/Upload'
import * as fieldStyles from 'ui/components/_internal/Field/Field.css'
import { srOnlyClass } from 'ui/styles/globals/utils.css'
import { TEMPORARY_SPACE_ICON_URL } from '@components/Web3/constants'
import { UseOnImageChangeEventProps, useOnImageChangeEvent } from './useOnImageChangeEvent'

export type UploadImageTemplateSize = 'tabletToDesktop' | 'lg' | 'sm'

type Props<T extends FieldValues> = {
    children: (props: {
        onClick: () => void
        isUploading: boolean
        errors: FieldErrors<T>[Path<T>] | undefined
        inputField: React.ReactNode
    }) => JSX.Element
    canEdit: boolean
    resourceId: string
    formFieldName: Path<T>
    type: UseOnImageChangeEventProps<T>['type']
    imageRestrictions?: UseOnImageChangeEventProps<T>['imageRestrictions']
    onUploadImage?: UseOnImageChangeEventProps<T>['onUploadImage']
    onFileAdded?: () => void
} & Pick<UseFormReturn<T>, 'setError' | 'clearErrors' | 'formState' | 'register'>

export const UploadImageRenderer = <T extends FieldValues>(props: Props<T>) => {
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
        onUploadImage,
        onFileAdded,
    } = props

    const { onChange, isUploading } = useOnImageChangeEvent({
        onUploadImage,
        resourceId,
        type,
        imageRestrictions,
        formFieldName,
        setError,
        clearErrors,
        formState,
        onFileAdded,
    })

    const failedResource = useImageStore((state) => state.erroredResources[resourceId])
    const loadedResource = useImageStore((state) => state.loadedResource[resourceId])
    const isLoading = resourceId !== TEMPORARY_SPACE_ICON_URL && !failedResource && !loadedResource

    const isLoadingOrUploading = isLoading || isUploading

    const ref = React.useRef<HTMLInputElement>(null)

    function onClick() {
        if (isLoadingOrUploading) {
            return
        }
        ref.current?.click()
    }

    return children({
        onClick,
        isUploading: isLoadingOrUploading,
        errors: formState?.errors[formFieldName],
        inputField: canEdit ? (
            <UploadInput
                name={formFieldName}
                className={[fieldStyles.field, srOnlyClass]}
                ref={ref}
                register={register}
                accept="image/*"
                onChange={onChange}
            />
        ) : (
            <></>
        ),
    })
}
