import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement } from '@udecode/plate-common'
import { Text } from '@ui'
import { paragraph } from '../RichTextEditor.css'

export const ParagraphElement = withRef<typeof PlateElement>(
    ({ className, children, ...props }, ref) => {
        return (
            <PlateElement asChild ref={ref} {...props}>
                <Text as="p" className={paragraph}>
                    {children}
                </Text>
            </PlateElement>
        )
    },
)
