import React from 'react'
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
    if (variant === 'span') {
        return (
            <Box as="span" display="inline-block" paddingLeft="xxs">
                {children}
            </Box>
        )
    }
    // eslint-disable-next-line
    // @ts-ignore
    return <Component className={classNameMap[variant]}>{children}</Component>
}
