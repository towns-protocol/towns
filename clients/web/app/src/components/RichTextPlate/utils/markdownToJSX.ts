import React from 'react'
import { Components, toJsxRuntime } from 'hast-util-to-jsx-runtime'
// @ts-expect-error: untyped.
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { VFile } from 'vfile'
import { ELEMENT_MENTION, TMentionElement } from '@udecode/plate-mention'
import remarkRehype from 'remark-rehype'
import { TChannelMentionElement } from './ComboboxTypes'
import { ELEMENT_MENTION_CHANNEL } from '../plugins/createChannelPlugin'
import { createUnifiedProcessor } from './deserializeMD'

export function Markdown(options: React.PropsWithChildren<{ components: Partial<Components> }>) {
    const children = options.children || ''
    // const className = options.className
    const components = options.components
    // @ts-expect-error: untyped.
    const processor = createUnifiedProcessor().use(remarkRehype, {
        passThrough: [ELEMENT_MENTION, ELEMENT_MENTION_CHANNEL],
        handlers: {
            [ELEMENT_MENTION]: (_: never, node: TMentionElement) => {
                return {
                    type: 'element',
                    value: String(node.value).trim(),
                    tagName: ELEMENT_MENTION,
                    children: String(node.value).trim(),
                }
            },
            [ELEMENT_MENTION_CHANNEL]: (_: never, node: TChannelMentionElement) => {
                return {
                    type: 'element',
                    value: String(node.value).trim(),
                    tagName: ELEMENT_MENTION_CHANNEL,
                    children: String(node.value).trim(),
                    channel: node.channel,
                }
            },
        },
    })

    const file = new VFile()

    if (typeof children === 'string') {
        file.value = children
    } else {
        throw new Error('Expected `children` to be a string')
    }

    const mdastTree = processor.parse(file)
    const hastTree = processor.runSync(mdastTree, file)

    return toJsxRuntime(hastTree, {
        development: true,
        Fragment,
        components,
        ignoreInvalidStyle: true,
        jsx,
        jsxs,
        jsxDEV: jsx,
        passKeys: true,
        passNode: true,
    })
}
