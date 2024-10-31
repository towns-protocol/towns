import React from 'react'
import { withRef } from '@udecode/cn'
import { getHandler } from '@udecode/plate-common'
import { PlateElement, useElement } from '@udecode/plate-common/react'
import { ChannelLink } from '../ChannelLink'
import { mentionChannelInput } from '../../RichTextEditor.css'
import { TChannelMentionElement } from './autocomplete/types'

export const ChannelMentionElement = withRef<
    typeof PlateElement,
    {
        onClick?: (mentionNode: Record<never, never>) => void
        renderLabel?: (mentionable: TChannelMentionElement) => string
    }
>(({ children, renderLabel, className, onClick, ...props }, ref) => {
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
            <ChannelLink channel={element.channel} />
            {children}
        </PlateElement>
    )
})
