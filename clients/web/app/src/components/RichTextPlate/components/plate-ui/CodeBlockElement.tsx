import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement } from '@udecode/plate-common'
import { codeBlock } from '@components/RichTextPlate/RichTextEditor.css'
import { Box } from '@ui'

export const CodeBlockElement = withRef<typeof PlateElement>(
    ({ className, children, ...props }, ref) => {
        return (
            <Box ref={ref} as="code" className={codeBlock}>
                {children}
            </Box>
        )
    },
)
