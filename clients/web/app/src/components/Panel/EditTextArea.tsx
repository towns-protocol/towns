import React, { forwardRef } from 'react'
import { Box, Paragraph, Text, TextButton } from '@ui'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { FieldBaseProps } from 'ui/components/_internal/Field/Field'

type Props = {
    canEdit: boolean | undefined
    isEditing: boolean
    isSetting: boolean
    isLoading: boolean
    defaultValue: string | undefined
    errorMessage: string | null
    maxLength: number
    height: FieldBaseProps['height']
    label: string
    notExistYetText?: string
    onSave: () => void
    onEdit: () => void
    onCancel: () => void
}

export const EditTextArea = forwardRef<HTMLTextAreaElement, Props>((props, ref) => {
    const {
        canEdit,
        isEditing,
        isSetting,
        isLoading,
        defaultValue,
        errorMessage,
        maxLength,
        height,
        label,
        notExistYetText,
        onSave,
        onCancel,
        onEdit,
    } = props
    return (
        <>
            <Box horizontal justifyContent="spaceBetween" alignItems="center">
                <Paragraph strong color="default">
                    {label}
                </Paragraph>{' '}
                {canEdit &&
                    (isEditing ? (
                        <Box horizontal gap="sm">
                            <TextButton disabled={isSetting} onClick={onCancel}>
                                Cancel
                            </TextButton>
                            <Box horizontal gap data-testid="save-button">
                                <TextButton disabled={isSetting} color="default" onClick={onSave}>
                                    Save
                                </TextButton>
                                {isSetting && <ButtonSpinner />}
                            </Box>
                        </Box>
                    ) : (
                        <TextButton data-testid="edit-button" onClick={onEdit}>
                            Edit
                        </TextButton>
                    ))}
            </Box>
            {!isLoading &&
                (isEditing ? (
                    <>
                        <TextArea
                            ref={ref}
                            data-testid="edit-text-area"
                            paddingY="md"
                            background="level2"
                            defaultValue={defaultValue}
                            // don't know why this prop giving type errors
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            height={height}
                            maxLength={maxLength}
                            style={{ paddingRight: '2.5rem' }}
                        />
                        {errorMessage && (
                            <Text color="negative" size="sm">
                                {errorMessage}
                            </Text>
                        )}
                    </>
                ) : (
                    <Paragraph color="gray2">
                        {defaultValue ? defaultValue : notExistYetText}
                    </Paragraph>
                ))}
        </>
    )
})
