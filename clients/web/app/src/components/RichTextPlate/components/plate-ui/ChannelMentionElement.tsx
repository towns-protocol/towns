import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement, getHandler, useElement } from '@udecode/plate-common'
import { ChannelLink } from '../ChannelLink'
import { mentionChannelInput } from '../../RichTextEditor.css'
import { TChannelMentionElement } from '../../utils/ComboboxTypes'

export const ChannelMentionElement = withRef<
    typeof PlateElement,
    {
        prefix?: string
        onClick?: (mentionNode: Record<never, never>) => void
        renderLabel?: (mentionable: TChannelMentionElement) => string
    }
>(({ children, prefix, renderLabel, className, onClick, ...props }, ref) => {
    const element = useElement<TChannelMentionElement>()

    return (
        <PlateElement
            ref={ref}
            className={mentionChannelInput}
            data-slate-value={element.value}
            contentEditable={false}
            as="span"
            onClick={getHandler(onClick, element)}
            {...props}
        >
            {prefix}
            <ChannelLink channel={element.channel} />
        </PlateElement>
    )
})
