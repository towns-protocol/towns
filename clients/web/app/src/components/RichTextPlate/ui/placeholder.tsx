import React from 'react'
import { cn } from '@udecode/cn'
import { PlaceholderProps, createNodesHOC, usePlaceholderState } from '@udecode/plate-common'
import { ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph'

export const Placeholder = (props: PlaceholderProps) => {
    const { children, placeholder, nodeProps } = props

    const { enabled } = usePlaceholderState(props)

    return React.Children.map(children, (child) => {
        return React.cloneElement(child, {
            className: child.props.className,
            nodeProps: {
                ...nodeProps,
                className: cn(
                    enabled &&
                        'before:absolute before:cursor-text before:opacity-30 before:content-[attr(placeholder)]',
                ),
                placeholder,
            },
        })
    })
}

export const withPlaceholdersPrimitive = createNodesHOC(Placeholder)

export const withPlaceholders = (components: never) =>
    withPlaceholdersPrimitive(components, [
        {
            key: ELEMENT_PARAGRAPH,
            placeholder: 'Type a paragraph',
            hideOnBlur: true,
            query: {
                maxLevel: 1,
            },
        },
    ])
