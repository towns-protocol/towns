import React from 'react'
import { PlateRenderElementProps } from '@udecode/plate-core'
import { codeBlock } from '@components/RichTextPlate/RichTextEditor.css'
import { Box } from '@ui'

export const CodeBlockElement = React.forwardRef<HTMLElement>(
    (props: Partial<PlateRenderElementProps>, ref) => {
        return (
            <Box {...(props.attributes ?? {})} as="code" className={codeBlock}>
                {props.children}
            </Box>
        )
    },
)
