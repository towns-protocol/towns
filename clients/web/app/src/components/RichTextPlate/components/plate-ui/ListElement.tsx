import React from 'react'
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
}: React.PropsWithChildren<{ variant: keyof JSX.IntrinsicElements }>) => {
    const Component = variant!
    if (![ELEMENT_OL, ELEMENT_UL, ELEMENT_LI].includes(variant)) {
        return (
            <Box as="span" display="inline" paddingLeft="xxs">
                {children}
            </Box>
        )
    }
    // eslint-disable-next-line
    // @ts-ignore
    return <Component className={classNameMap[variant]}>{children}</Component>
}
