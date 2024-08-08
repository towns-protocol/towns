import React, { useCallback, useRef } from 'react'
import { withRef } from '@udecode/cn'
import { PlateElement, getHandler, useElement } from '@udecode/plate-common'
import { Box } from '@ui'
import { mentionInput } from '../../RichTextEditor.css'
import { TUserMentionElement } from './autocomplete/types'

export const MentionElement = withRef<
    typeof PlateElement,
    {
        prefix?: string
        onClick?: (mentionNode: Record<never, never>) => void
        renderLabel?: (mentionable: TUserMentionElement) => string
    }
>(({ children, prefix = '', renderLabel, className, onClick, ...props }, ref) => {
    const element = useElement<TUserMentionElement>()

    return (
        <Box
            as="span"
            display="inline-block"
            data-slate-value={element.value}
            contentEditable={false}
            onClick={getHandler(onClick, element)}
            {...props.attributes}
            ref={props.attributes.ref ?? ref}
        >
            <MentionElementWithoutPlate value={prefix + element.value} />
            {children}
        </Box>
    )
})

export interface MentionElementWithoutPlateProps {
    value?: string
    userId?: string
    onMentionHover?: (element?: HTMLElement, userId?: string) => void
    onMentionClick?: (mentionName: string) => void
}
export const MentionElementWithoutPlate = ({
    value,
    userId,
    onMentionHover,
    onMentionClick,
}: React.PropsWithChildren<MentionElementWithoutPlateProps>) => {
    const ref = useRef<HTMLSpanElement>(null)

    const handleMouseEnter = useCallback(() => {
        if (!onMentionHover || !ref.current) {
            return
        }
        onMentionHover(ref.current, userId)
    }, [onMentionHover, userId])

    const handleMouseLeave = useCallback(() => {
        if (!onMentionHover) {
            return
        }
        onMentionHover(undefined, undefined)
    }, [onMentionHover])

    const handleClick = useCallback(() => {
        if (!onMentionClick || !userId) {
            return
        }
        onMentionClick(userId)
    }, [onMentionClick, userId])

    return (
        <Box
            as="span"
            display="inline-block"
            className={mentionInput}
            ref={ref}
            data-mention-username={value}
            data-mention-userid={userId}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {value}
        </Box>
    )
}
