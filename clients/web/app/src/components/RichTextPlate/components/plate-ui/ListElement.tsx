import React from 'react'
import { PlateRenderElementProps } from '@udecode/plate-core'
import { ELEMENT_LI, ELEMENT_OL, ELEMENT_UL } from '@udecode/plate-list'
import { Box } from '@ui'
import { listitem, ol, ul } from '../../RichTextEditor.css'

const classNameMap = {
    ul,
    ol,
    li: listitem,
    span: '',
} as const
export const ListElement = ({
    variant,
    children,
    attributes,
    element,
    start,
}: React.PropsWithChildren<
    { variant: keyof JSX.IntrinsicElements; start?: number } & Partial<PlateRenderElementProps>
>) => {
    const Component = variant!
    if (![ELEMENT_OL, ELEMENT_UL, ELEMENT_LI].includes(variant)) {
        return (
            <Box as="span" display="inline" paddingLeft="xxs" {...(attributes ?? {})}>
                {children}
            </Box>
        )
    }

    let olStartIndex = undefined
    if (ELEMENT_OL === variant) {
        olStartIndex = (element?.start as number) ?? start
    }

    return (
        // eslint-disable-next-line
        // @ts-ignore
        <Component className={classNameMap[variant]} start={olStartIndex} {...(attributes ?? {})}>
            {children}
        </Component>
    )
}
