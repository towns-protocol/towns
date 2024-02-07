import { RenderElementProps } from 'slate-react'
import React from 'react'
import { clsx } from 'clsx'
import { Text } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { theme } from '@components/RichText/RichTextEditor.theme'
import { TextProps } from 'ui/components/Text/Text'
import {
    ALL_TAG_TYPES,
    BLOCK_QUOTE,
    CODE_BLOCK,
    H1,
    LINEBREAK,
    LINK,
    LIST_ITEM,
    OL_LIST,
    PARAGRAPH,
    SOFTBREAK,
    UL_LIST,
} from '../utils/schema'

/**
 * Renders different elements according to the properties.
 */
const Element = (props: RenderElementProps) => {
    const { attributes, children, element } = props
    const { type, data, depth } = element
    const baseElementRenderer: { [k in ALL_TAG_TYPES]: () => JSX.Element } = {
        [PARAGRAPH]: () => (
            <Text as="p" display="block" {...attributes} style={{ marginBottom: vars.space.md }}>
                {children}
            </Text>
        ),
        [H1]: () => (
            <Text
                as={`h${depth}` as TextProps['as']}
                display="block"
                {...attributes}
                style={{ marginBottom: vars.space.md }}
            >
                {children}
            </Text>
        ),
        [SOFTBREAK]: () => (
            <span className={SOFTBREAK} {...attributes}>
                {' '}
                {children}
            </span>
        ),
        [LINEBREAK]: () => (
            <span {...attributes}>
                <span contentEditable={false} style={{ userSelect: 'none' }}>
                    <br />
                </span>
                {children}
            </span>
        ),
        [LINK]: () => (
            <a {...attributes} href={data?.href}>
                {children}
            </a>
        ),
        [CODE_BLOCK]: () => <pre {...attributes}>{children}</pre>,
        [BLOCK_QUOTE]: () => (
            <Text as="blockquote" {...attributes} className={theme.quote}>
                {children}
            </Text>
        ),
        [OL_LIST]: () => (
            <ol {...attributes} className={theme.list?.ol}>
                {children}
            </ol>
        ),
        [UL_LIST]: () => (
            <ul
                {...attributes}
                className={theme.list?.ul}
                style={{ listStylePosition: 'inside', marginBottom: vars.space.md }}
            >
                {children}
            </ul>
        ),
        [LIST_ITEM]: () => (
            <li
                {...attributes}
                className={clsx(theme.list?.listitem, (theme.list?.ulDepth || [])[0])}
            >
                {children}
            </li>
        ),
        // [HR]: () => <HorizontalRule {...props} />,
        default: () => {
            console.log(`Didn't know how to render ${JSON.stringify(element, null, 2)}`)
            return <p {...attributes}>{children}</p>
        },
    }

    return (baseElementRenderer[type] || baseElementRenderer.default)()
}

export default Element
