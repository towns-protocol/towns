import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateLeaf } from '@udecode/plate-common'
import { Box } from '@ui'
import { code } from '../../RichTextEditor.css'
export const CodeLeaf = withRef<typeof PlateLeaf>(({ className, children, ...props }, ref) => {
    return (
        <PlateLeaf asChild ref={ref} {...props}>
            <Box as="code" className={code} display="inline-block">
                {children}
            </Box>
        </PlateLeaf>
    )
})
