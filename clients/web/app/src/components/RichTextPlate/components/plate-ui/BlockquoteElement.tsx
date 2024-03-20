import React from 'react'
import { Box } from '@ui'
import { blockquote } from '../../RichTextEditor.css'

export const BlockquoteElement = ({ children }: React.PropsWithChildren) => {
    return (
        <Box as="blockquote" className={blockquote}>
            {children}
        </Box>
    )
}
