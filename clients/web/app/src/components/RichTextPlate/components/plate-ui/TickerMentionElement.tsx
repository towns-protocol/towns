import { withRef } from '@udecode/cn'
import { getHandler } from '@udecode/plate-common'
import { PlateElement, useElement } from '@udecode/plate-common/react'
import React, { useRef } from 'react'
import { Box } from '@ui'
import { mentionInput } from '@components/RichTextPlate/RichTextEditor.css'
import { TTickerMentionElement } from './autocomplete/types'

export const TickerMentionElement = withRef<
    typeof PlateElement,
    {
        prefix?: string
        onClick?: (mentionNode: Record<never, never>) => void
        renderLabel?: (mentionable: TTickerMentionElement) => string
    }
>(({ children, prefix = '$', renderLabel, className, onClick, ...props }, ref) => {
    const element = useElement<TTickerMentionElement>()

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
            <TickerMentionElementWithoutPlate
                symbol={prefix + (element.ticker?.symbol ?? 'unknown')}
            />
            {children}
        </Box>
    )
})

export interface TickerMentionElementWithoutPlateProps {
    symbol: string
}

export const TickerMentionElementWithoutPlate = ({
    symbol,
}: React.PropsWithChildren<TickerMentionElementWithoutPlateProps>) => {
    const ref = useRef<HTMLSpanElement>(null)

    return (
        <Box
            as="span"
            display="inline-block"
            className={mentionInput}
            ref={ref}
            data-mention-ticker={symbol}
        >
            {symbol}
        </Box>
    )
}
