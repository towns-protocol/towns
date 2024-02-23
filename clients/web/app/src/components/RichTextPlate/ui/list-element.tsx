import React from 'react'
import { PlateElement } from '@udecode/plate-common'
import { withRef } from '@udecode/cn'
import { Box } from '@ui'
import { listitem, ol, ul } from '../RichTextEditor.css'

const classNameMap = {
    ul,
    ol,
    li: listitem,
    span: '',
}
export const ListElement = withRef<typeof PlateElement, { variant: 'ul' | 'ol' | 'li' | 'span' }>(
    ({ className, variant, children, ...props }, ref) => {
        const Component = variant!
        return (
            <PlateElement asChild ref={ref} {...props}>
                {variant === 'span' ? (
                    <Box as="span" display="inline-block">
                        {children}
                    </Box>
                ) : (
                    <Component className={classNameMap[variant]}>{children}</Component>
                )}
            </PlateElement>
        )
    },
)
