import { EditorThemeClasses } from 'lexical'
import { clsx } from 'clsx'
import { atoms } from 'ui/styles/atoms.css'

import {
    code,
    listitem,
    listitemChecked,
    listitemUnchecked,
    nestedListItem,
    ol,
    ol1,
    ol2,
    ol3,
    ol4,
    paragraph,
    quote,
    root,
    ul,
    ul1,
    ul2,
    ul3,
    ul4,
} from './RichTextEditor.css'

const tokens = {
    attribute: atoms({ color: 'accent' }),
    property: atoms({ color: 'cta1' }),
    selector: atoms({ color: 'cta2' }),
    function: atoms({ color: 'cta2' }),
    comment: atoms({ color: 'gray1' }),
    operator: atoms({ color: 'cta1' }),
    variable: atoms({ color: 'cta2' }),
    punctuation: atoms({ color: 'default' }),
}

export const theme: EditorThemeClasses = {
    paragraph,
    root,
    code: clsx([
        atoms({
            padding: 'sm',
            display: 'block',
            borderRadius: 'xs',
            background: 'level2',
            border: 'level4',
        }),
        code,
    ]),
    codeHighlight: {
        atrule: tokens.attribute,
        attr: tokens.attribute,
        boolean: tokens.property,
        builtin: tokens.selector,
        cdata: tokens.comment,
        char: tokens.selector,
        class: tokens.function,
        'class-name': tokens.function,
        comment: tokens.comment,
        constant: tokens.property,
        deleted: tokens.property,
        doctype: tokens.comment,
        entity: tokens.operator,
        function: tokens.function,
        important: tokens.variable,
        inserted: tokens.selector,
        keyword: tokens.attribute,
        namespace: tokens.variable,
        number: tokens.property,
        operator: tokens.operator,
        prolog: tokens.comment,
        property: tokens.property,
        punctuation: tokens.punctuation,
        regex: tokens.variable,
        selector: tokens.selector,
        string: tokens.selector,
        symbol: tokens.property,
        tag: tokens.property,
        url: tokens.operator,
        variable: tokens.variable,
    },
    quote: clsx([
        atoms({
            paddingLeft: 'sm',
            borderLeft: 'strong',
            fontStyle: 'italic',
        }),
        quote,
    ]),
    bold: atoms({
        fontWeight: 'strong',
    }),
    link: atoms({
        color: 'cta2',
    }),
    list: {
        ul: ul,
        ol: ol,
        listitem,
        listitemChecked,
        listitemUnchecked,
        nested: {
            listitem: nestedListItem,
        },
        olDepth: [ol1, ol2, ol3, ol4],
        ulDepth: [ul1, ul2, ul3, ul4],
    },
    text: {
        bold: atoms({
            fontWeight: 'strong',
        }),
        code: atoms({
            color: 'default',
            background: 'level2',
            paddingX: 'xxs',
            rounded: 'xs',
            border: 'level3',
        }),
        italic: atoms({
            fontStyle: 'italic',
        }),
        strikethrough: atoms({
            textDecoration: 'lineThrough',
        }),
        underline: atoms({
            textDecoration: 'underline',
        }),
    },
}
