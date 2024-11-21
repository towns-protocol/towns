import { UseFormReturn } from 'react-hook-form'
import React, { PropsWithChildren, useState } from 'react'
import { Box, Icon, Paragraph } from '@ui'
import { CreateTownFormSchema } from '../types'

export const FormDebug = ({
    form,
    data,
}: {
    form: UseFormReturn<CreateTownFormSchema>
    data: Record<string, number | string>
}) => {
    const { formState } = form
    const [isExpanded, setIsExpanded] = useState(false)

    const errors = cleanErrors(formState.errors)

    return (
        <Box padding position="absolute" top="none" left="none" height="100%" pointerEvents="none">
            {!isExpanded ? (
                <Box
                    horizontal
                    hoverable
                    elevate
                    pointerEvents="auto"
                    gap="xs"
                    alignItems="center"
                    background="level2"
                    borderRadius="xs"
                    paddingY="sm"
                    paddingX="sm"
                    color="gray2"
                    cursor="pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <Icon type="info" color="inherit" size="square_xs" />
                    <Paragraph style={{ userSelect: 'none' }} size="sm">
                        Debug
                    </Paragraph>
                </Box>
            ) : (
                <Box maxHeight="100%">
                    <Box
                        padding
                        gap
                        scroll
                        pointerEvents="auto"
                        background="level2"
                        borderRadius="xs"
                        opacity="0.5"
                        fontSize="xs"
                        maxWidth="400"
                        border="default"
                        onDoubleClick={() => setIsExpanded(false)}
                    >
                        <Mono>{JSON.stringify(data, null, 2)}</Mono>
                        <Mono>{JSON.stringify(form.getValues(), null, 2)}</Mono>
                        <Mono>{JSON.stringify({ isValid: formState.isValid }, null, 2)}</Mono>
                        {!!errors && (
                            <Mono>
                                Errors:
                                <br />
                                {JSON.stringify(cleanErrors(formState.errors), null, 2)}
                            </Mono>
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    )
}

const Mono = (props: PropsWithChildren) => (
    <pre style={{ fontFamily: 'monospace' }}>{props.children}</pre>
)

/**
 * avoid circular references in the error object
 */
export function cleanErrors(errors: Record<string, object>) {
    return Object.entries(errors)
        .map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                const cleaned: Record<string, object> = {}
                for (const [k, v] of Object.entries(value)) {
                    if (k !== 'ref' && k !== 'refValue') {
                        if (typeof v === 'object' && v !== null) {
                            cleaned[k] = cleanErrors({ [k]: v })[0]
                        } else {
                            cleaned[k] = v
                        }
                    }
                }
                return { key, ...cleaned }
            }
            return { key, value }
        })
        .filter(Boolean)
}
