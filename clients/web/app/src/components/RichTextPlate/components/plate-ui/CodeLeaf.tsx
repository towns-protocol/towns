import React from 'react'
import { Box } from '@ui'
import { code } from '../../RichTextEditor.css'
export const CodeLeaf = ({ children }: React.PropsWithChildren) => {
    return (
        <Box as="code" className={code} display="inline-block">
            {children}
        </Box>
    )
}
