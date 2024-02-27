import React from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement, getHandler, useElement } from '@udecode/plate-common'
import { TMentionElement } from '@udecode/plate-mention'
import { Channel } from 'use-zion-client'
import { ChannelLink } from '@components/RichTextPlate/components/ChannelLink'
import { mentionChannelInput } from '../RichTextEditor.css'

type TChannelMentionElement = TMentionElement & { channel: Channel }

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
            onClick={getHandler(onClick, element)}
            {...props}
        >
            {prefix}
            <ChannelLink channel={element.channel} />
            {/*{children}*/}
        </PlateElement>
    )
})
