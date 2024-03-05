import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement, useElement } from '@udecode/plate-common'
import { TEmojiMentionElement } from '../../utils/ComboboxTypes'

export const EmojiMentionElement = withRef<
    typeof PlateElement,
    {
        prefix?: string
        onClick?: (mentionNode: Record<never, never>) => void
    }
>(({ children, prefix, className, onClick, ...props }, ref) => {
    const element = useElement<TEmojiMentionElement>()
    return (
        <span data-slate-value={element.value} title={element.emoji.name}>
            {element.emoji.emoji}
            {children}
        </span>
    )
})
