import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement, getHandler, useElement } from '@udecode/plate-common'
import { TMentionElement } from '@udecode/plate-mention'
import { mentionInput } from '../RichTextEditor.css'

export const MentionElement = withRef<
    typeof PlateElement,
    {
        prefix?: string
        onClick?: (mentionNode: Record<never, never>) => void
        renderLabel?: (mentionable: TMentionElement) => string
    }
>(({ children, prefix, renderLabel, className, onClick, ...props }, ref) => {
    const element = useElement<TMentionElement>()

    return (
        <PlateElement
            ref={ref}
            className={mentionInput}
            data-slate-value={element.value}
            contentEditable={false}
            onClick={getHandler(onClick, element)}
            {...props}
        >
            {prefix}
            {renderLabel ? renderLabel(element) : element.value}
            {children}
        </PlateElement>
    )
})
