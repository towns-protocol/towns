import React, { useCallback, useRef } from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement, getHandler, useElement } from '@udecode/plate-common'
import { TMentionElement } from '@udecode/plate-mention'
import { Box } from '@ui'
import { mentionInput } from '../../RichTextEditor.css'

export const MentionElement = withRef<
    typeof PlateElement,
    {
        prefix?: string
        onClick?: (mentionNode: Record<never, never>) => void
        renderLabel?: (mentionable: TMentionElement) => string
    }
>(({ children, prefix = '', renderLabel, className, onClick, ...props }, ref) => {
    const element = useElement<TMentionElement>()

    return (
        <Box
            as="span"
            display="inline-block"
            ref={ref}
            data-slate-value={element.value}
            contentEditable={false}
            onClick={getHandler(onClick, element)}
        >
            <MentionElementWithoutPlate value={prefix + element.value} />
            {children}
        </Box>
    )
})

export interface MentionElementWithoutPlateProps {
    value?: string
    onMentionHover?: (element?: HTMLElement, username?: string) => void
    onMentionClick?: (mentionName: string) => void
}
export const MentionElementWithoutPlate = ({
    value,
    onMentionHover,
    onMentionClick,
}: React.PropsWithChildren<MentionElementWithoutPlateProps>) => {
    const ref = useRef<HTMLSpanElement>(null)

    const handleMouseEnter = useCallback(() => {
        if (!onMentionHover || !ref.current) {
            return
        }
        onMentionHover(
            ref.current,
            ref.current.getAttribute('data-mention-username')?.slice(1) || '',
        )
    }, [onMentionHover])

    const handleMouseLeave = useCallback(() => {
        if (!onMentionHover) {
            return
        }
        onMentionHover(undefined, undefined)
    }, [onMentionHover])

    const handleClick = useCallback(() => {
        if (!onMentionClick || !value) {
            return
        }
        onMentionClick(value.slice(1))
    }, [onMentionClick, value])

    return (
        <Box
            as="span"
            display="inline-block"
            className={mentionInput}
            ref={ref}
            data-mention-username={value}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {value}
        </Box>
    )
}
