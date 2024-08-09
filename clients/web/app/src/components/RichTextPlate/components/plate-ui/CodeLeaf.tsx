import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateLeaf } from '@udecode/plate-common'
import { Box } from '@ui'
import { code } from '../../RichTextEditor.css'

export const CodeLeaf = withRef<typeof PlateLeaf>(
    ({ children, attributes = {}, ...props }, ref) => {
        return (
            <Box
                as="code"
                className={code}
                display="inline-block"
                contentEditable={props.contentEditable}
                {...attributes}
                ref={ref}
            >
                {children}
            </Box>
        )
    },
)
