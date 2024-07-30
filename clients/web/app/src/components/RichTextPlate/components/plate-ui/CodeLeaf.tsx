import React from 'react'
import { Box } from '@ui'
import { code } from '../../RichTextEditor.css'
export const CodeLeaf = ({ children, ...restProps }: React.PropsWithChildren) => {
    return (
        <Box as="code" className={code} display="inline-block" {...restProps}>
            {children}
        </Box>
    )
}
