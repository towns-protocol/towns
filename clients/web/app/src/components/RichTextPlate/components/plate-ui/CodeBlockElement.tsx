import React from 'react'
import { codeBlock } from '@components/RichTextPlate/RichTextEditor.css'
import { Box } from '@ui'

export const CodeBlockElement = React.forwardRef<HTMLElement>(
    (props: React.PropsWithChildren, ref) => {
        return (
            <Box ref={ref} as="code" className={codeBlock}>
                {props.children}
            </Box>
        )
    },
)
