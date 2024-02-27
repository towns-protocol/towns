import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement, getHandler } from '@udecode/plate-common'
import { mentionInput } from '../RichTextEditor.css'

export const MentionInputElement = withRef<
    typeof PlateElement,
    {
        prefix?: string
        onClick?: (mentionNode: Record<never, never>) => void
    }
>(({ className, prefix, onClick, ...props }, ref) => {
    const { children, element } = props

    return (
        <PlateElement
            asChild
            ref={ref}
            data-slate-value={element.value}
            className={mentionInput}
            onClick={getHandler(onClick, element)}
            {...props}
        >
            <span>
                {element.trigger}
                {children}
            </span>
        </PlateElement>
    )
})
