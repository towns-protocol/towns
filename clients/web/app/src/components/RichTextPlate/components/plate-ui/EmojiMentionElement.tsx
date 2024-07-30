import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement, useElement } from '@udecode/plate-common'
import { Box } from '@ui'
import { TEmojiMentionElement } from './autocomplete/types'

export const EmojiMentionElement = withRef<
    typeof PlateElement,
    {
        prefix?: string
        onClick?: (mentionNode: Record<never, never>) => void
    }
>(({ children, prefix, className, onClick, ...props }, ref) => {
    const element = useElement<TEmojiMentionElement>()
    return (
        <Box
            as="span"
            display="inline-block"
            paddingX="xs"
            data-slate-value={element.value}
            title={element.emoji.name}
            {...props.attributes}
            ref={ref}
        >
            {element.emoji.emoji}
            {children}
        </Box>
    )
})
