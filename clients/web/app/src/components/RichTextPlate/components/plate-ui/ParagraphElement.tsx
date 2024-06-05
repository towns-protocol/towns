import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement } from '@udecode/plate-common'
import { Text } from '@ui'
import { paragraph } from '../../RichTextEditor.css'

export const ParagraphElement = withRef<typeof PlateElement>(
    ({ className, children, ...props }, ref) => {
        return (
            <PlateElement asChild ref={ref} {...props}>
                <ParagraphWithoutPlate>{children}</ParagraphWithoutPlate>
            </PlateElement>
        )
    },
)

export const ParagraphWithoutPlate = React.forwardRef<
    HTMLParagraphElement,
    React.PropsWithChildren
>(({ children }, ref) => (
    <Text as="p" className={paragraph} ref={ref}>
        {children}
    </Text>
))
