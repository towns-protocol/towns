import React, { PropsWithChildren, useRef } from 'react'
import { withRef } from '@udecode/cn'
import { getHandler } from '@udecode/plate-common'
import { PlateElement, useElement } from '@udecode/plate-common/react'
import { Box, Icon } from '@ui'
import { mentionInput } from '@components/RichTextPlate/RichTextEditor.css'
import { atoms } from 'ui/styles/atoms.css'
import { shortAddress } from 'ui/utils/utils'
import { TContractAddressElement, TTickerMentionElement } from './autocomplete/types'

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

export const ContractAddressElementWithoutPlate = ({
    children,
    address,
}: PropsWithChildren<{ address: string }>) => {
    const short = shortAddress(address)
    return (
        <Box
            horizontal
            gap="xs"
            cursor="pointer"
            title={address}
            autoCorrect="off"
            display="inline-flex"
            className={atoms({
                background: 'level3',
                color: 'gray2',
                fontSize: 'sm',
                borderRadius: 'xs',
                paddingX: 'xs',
                insetY: 'xxs',
                border: 'level4',
            })}
        >
            {short}
            <Box paddingTop="xxs">
                <Icon type="copy" display="inline-block" size="square_xxs" />
            </Box>
            {children}
        </Box>
    )
}

export const ContractAddressElement = (props: React.PropsWithChildren) => {
    const element = useElement<TContractAddressElement>()
    return (
        <ContractAddressElementWithoutPlate address={element.address}>
            {props.children}
        </ContractAddressElementWithoutPlate>
    )
}
