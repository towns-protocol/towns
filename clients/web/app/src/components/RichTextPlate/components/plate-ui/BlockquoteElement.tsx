import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement } from '@udecode/plate-common/react'
import { Box } from '@ui'
import { blockquote } from '../../RichTextEditor.css'

export const BlockquoteElement = withRef<typeof PlateElement>(
    ({ children, className, ...props }, ref) => {
        return (
            <PlateElement ref={ref} as="blockquote" className={blockquote} {...props}>
                {children}
            </PlateElement>
        )
    },
)

export const BlockquoteElementWithoutPlate = ({ children }: React.PropsWithChildren) => {
    return (
        <Box as="blockquote" display="block" className={blockquote}>
            {children}
        </Box>
    )
}
