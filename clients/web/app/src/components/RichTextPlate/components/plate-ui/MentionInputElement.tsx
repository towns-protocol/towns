import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement, getHandler } from '@udecode/plate-common'
import { comboboxSelectors } from '@udecode/plate-combobox'
import { getFilteredItemsWithoutMockEmoji } from '../../utils/helpers'

import { mentionInput } from '../../RichTextEditor.css'

export const MentionInputElement = withRef<
    typeof PlateElement,
    {
        prefix?: string
        onClick?: (mentionNode: Record<never, never>) => void
    }
>(({ className, prefix, onClick, ...props }, ref) => {
    const { children, element } = props
    const { filteredItems, text } = comboboxSelectors.state()
    const matchLength = getFilteredItemsWithoutMockEmoji(filteredItems).length

    return (
        <PlateElement
            asChild
            ref={ref}
            data-slate-value={element.value}
            className={matchLength > 0 || !text ? mentionInput : ''}
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
