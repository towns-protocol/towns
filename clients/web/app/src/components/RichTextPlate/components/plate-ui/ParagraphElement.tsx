import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement } from '@udecode/plate-common/react'
import { Text } from '@ui'
import { paragraph } from '../../RichTextEditor.css'

export const ParagraphElement = withRef<typeof PlateElement>(
    ({ className, children, ...props }, ref) => {
        return (
            <PlateElement as="p" className={paragraph} ref={ref} {...props}>
                {children}
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
