import React from 'react'
import { Stack } from 'ui/components/Stack/Stack'
import { Paragraph } from 'ui/components/Text/Paragraph'
import { Text } from 'ui/components/Text/Text'

export type FieldLabelProps = {
    label?: string
    secondaryLabel?: string
    description?: string
    for: string
}

export const FieldLabel = (props: FieldLabelProps) => {
    return props.label || props.secondaryLabel ? (
        <Stack as="label" gap="md" htmlFor={props.for}>
            <Stack horizontal gap="xs">
                <Text strong>{props.label}</Text>
                <Text color="gray1">{props.secondaryLabel}</Text>
            </Stack>
            {props.description && <Paragraph color="gray1">{props.description}</Paragraph>}
        </Stack>
    ) : (
        <></>
    )
}
