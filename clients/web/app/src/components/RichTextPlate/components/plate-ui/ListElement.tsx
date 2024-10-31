import React from 'react'
import { PlateRenderElementProps } from '@udecode/plate-common/react'
import { BulletedListPlugin, ListItemPlugin, NumberedListPlugin } from '@udecode/plate-list/react'
import { Box } from '@ui'
import { listitem, ol, ul } from '../../RichTextEditor.css'

type ListTypes =
    | typeof BulletedListPlugin.key
    | typeof NumberedListPlugin.key
    | typeof ListItemPlugin.key
    | 'span'

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
    { variant: ListTypes; start?: number } & Partial<PlateRenderElementProps>
>) => {
    const Component = variant!
    if (
        !(
            [BulletedListPlugin.key, NumberedListPlugin.key, ListItemPlugin.key] as ListTypes[]
        ).includes(variant)
    ) {
        return (
            <Box as="span" display="inline" paddingLeft="xxs" {...(attributes ?? {})}>
                {children}
            </Box>
        )
    }

    let olStartIndex = undefined
    if (NumberedListPlugin.key === variant) {
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
