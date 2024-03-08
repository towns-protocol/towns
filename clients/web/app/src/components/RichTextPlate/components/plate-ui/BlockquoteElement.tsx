import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement } from '@udecode/plate-common'
import { Box } from '@ui'
import { blockquote } from '../../RichTextEditor.css'

export const BlockquoteElement = withRef<typeof PlateElement>(
    ({ className, children, ...props }, ref) => {
        return (
            <Box ref={ref} as="blockquote" className={blockquote}>
                {children}
            </Box>
        )
    },
)
