import { globalStyle, style } from '@vanilla-extract/css'
import { atoms } from 'ui/styles/atoms.css'
import { scrollContainerClass } from 'ui/styles/globals/scrollcontainer.css'
import { baseline, vars } from 'ui/styles/vars.css'

export const richText = style([
    atoms({
        position: 'relative',
    }),
])

export const editMode = style({})

export const contentEditable = style([
    scrollContainerClass,
    atoms({
        paddingY: 'md',
    }),
    {
        outline: 'none',
        whiteSpace: 'pre-wrap',
        maxHeight: `${baseline * (4 + 22.5)}px`, // pseudo-arbitrary
    },
])

export const contentEditablePWA = style([
    {
        minHeight: `${baseline * 7}px`,
    },
])

export const paragraph = style({
    overflowWrap: 'anywhere',
})
export const edited = style({
    marginLeft: vars.space.xs,
})

export const link = style([
    atoms({
        color: 'cta2',
        cursor: 'pointer',
    }),
    {
        overflowWrap: 'anywhere',
        display: 'inline',
    },
])

export const mentionInput = style([
    atoms({
        display: 'inline',
        fontWeight: 'medium',
        background: { default: 'level2', hover: 'hover' },
        border: { default: 'level3', hover: 'level4' },
        rounded: 'xs',
        fontSize: { desktop: 'md', mobile: 'mds' },
        cursor: 'pointer',
        color: 'default',
    }),
    {
        letterSpacing: 'unset',
    },
])

globalStyle(`${mentionInput}:hover, ${mentionInput}:focus`, {
    outline: 'none',
})

export const mentionInputInner = style([
    atoms({
        display: 'inline',
        rounded: 'xs',
        color: 'default',
    }),
    {
        background: 'none',
        border: 'none',
        outline: 'none',
        width: '100%',
        minWidth: 1,
        position: 'absolute',
        left: 0,
        top: 0,
    },
])

export const mentionInputInvisibleSpan = style([
    {
        display: 'inline',
        visibility: 'hidden',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
    },
])

export const mentionChannelInput = style([
    atoms({
        display: 'inline-block',
        cursor: 'pointer',
    }),
])

export const ul = style({
    margin: `${vars.space.xs} 0`,
    padding: 0,
    listStylePosition: 'outside',
    listStyleType: 'disc',
})

export const ol = style({
    margin: `${vars.space.xs} 0`,
    padding: 0,
    listStylePosition: 'outside',
    listStyleType: 'decimal',
})

export const listitem = style({
    margin: `${vars.space.none} ${vars.space.none}`,
})

const listitemCheckedShared = style({
    position: 'relative',
    marginLeft: `${vars.space.sm}`,
    marginRight: `${vars.space.sm}`,
    paddingLeft: `${vars.space.lg}`,
    paddingRight: `${vars.space.lg}`,
    listStyleType: 'none',
    outline: 'none',

    selectors: {
        ['&:before']: {
            content: '',
            display: 'block',
            border: `1px solid ${vars.color.background.level4}`,
            width: vars.dims.square.square_xs,
            height: vars.dims.square.square_xs,
            top: `0`,
            left: `0`,
            cursor: 'pointer',
            background: vars.color.background.level1,
            borderRadius: vars.borderRadius.xs,
            backgroundSize: 'cover',
            position: 'absolute',
        },
        ['&:focus:before']: {
            borderRadius: `2px`,
            boxShadow: ` 0 0 0 2px #a6cdef`,
        },
    },
})

export const listitemChecked = style([
    listitemCheckedShared,
    {
        margin: `${vars.space.xs} 0`,
        textDecoration: 'line-through',
        selectors: {
            ['&:after']: {
                content: '',
                display: `block`,
                position: `absolute`,
                cursor: 'pointer',
                borderColor: vars.color.foreground.default,
                borderStyle: `solid`,
                top: `4px`,
                width: `3px`,
                left: `7px`,
                height: `6px`,
                transform: `rotate(45deg)`,
                borderWidth: `0 2px 2px 0`,
            },
        },
    },
])

export const listitemUnchecked = style([
    listitemCheckedShared,
    {
        margin: `${vars.space.xs} 0`,
    },
])

export const code = style([
    atoms({
        color: 'default',
        background: 'level2',
        paddingX: 'xxs',
        rounded: 'xs',
        border: 'level4',
    }),
    {
        fontFamily: 'monospace',
        fontSize: vars.fontSize.sm,
        tabSize: vars.space.md,
        overflowWrap: 'anywhere',
    },
])

export const codeBlock = style([
    atoms({
        padding: 'sm',
        display: 'block',
        borderRadius: 'xs',
        background: 'level2',
        border: 'level4',
    }),
    {
        marginTop: vars.space.sm,
        marginBottom: vars.space.sm,
        whiteSpace: 'pre-wrap',
    },
    code,
])

export const blockquote = style([
    atoms({
        paddingLeft: 'sm',
        borderLeft: 'strong',
        fontStyle: 'italic',
    }),
    {
        marginTop: vars.space.md,
        marginLeft: vars.space.md,
        marginBottom: 0,
        paddingBottom: vars.space.xs,
    },
])

globalStyle(`${richText} ${blockquote} + ${blockquote}`, {
    marginTop: 0,
})

globalStyle(`${richText} ${blockquote} + ${paragraph}`, {
    marginTop: vars.space.md,
})

export const singleEmojiMessage = style({})
globalStyle(`${richText}${singleEmojiMessage} p`, {
    fontSize: `calc(${vars.fontSize.md} * 3)`,
    lineHeight: 1.5,
})

globalStyle(`${richText} ul ul, ${richText} ul ol`, {
    marginLeft: vars.space.md,
})

globalStyle(`${richText} ${ol} ${listitem}`, {
    marginLeft: vars.space.lg,
})

globalStyle(`${richText} ${codeBlock} ${code}`, {
    border: 'none',
})

globalStyle(`${richText}${editMode} ${code}`, {
    background: vars.color.background.level2,
})

globalStyle(`${richText} ${listitem} > *`, {
    verticalAlign: 'text-top',
})
globalStyle(`${richText} ol ul, ${richText} ol ol`, {
    marginLeft: vars.space.md,
})

globalStyle(`${richText} ul > ${listitem}:not(${listitemCheckedShared}) `, {
    marginLeft: vars.space.md,
})

globalStyle(
    `
  ${richText} ${paragraph} + ${ul},
  ${richText} ${paragraph} + ${ol},
  ${richText} ${ul} + *,
  ${richText} ${ol} + *
  `,
    {
        marginTop: vars.space.md,
    },
)

globalStyle(`${richText} ${ul}:first-of-type li:first-child`, {
    marginTop: 0,
})

globalStyle(`${richText} ${ul}:first-of-type li:last-child`, {
    marginBottom: 0,
})

globalStyle(`${richText} ${ul} ${ul}`, {
    listStyleType: 'square',
})

globalStyle(`${richText} ${ul} ${ul} ${ul}`, {
    listStyleType: 'disc',
})

globalStyle(`${richText} ${ul} ${ul} ${ul} ${ul}`, {
    listStyleType: 'square',
})

globalStyle(`${richText} ${ol} ${ol}`, {
    listStyleType: 'lower-alpha',
})

globalStyle(`${richText} ${ol} ${ol} ${ol}`, {
    listStyleType: 'lower-roman',
})

globalStyle(`${richText} ${ol} ${ol} ${ol} ${ol}`, {
    listStyleType: 'decimal',
})

globalStyle(`${codeBlock} strong, ${code} strong, ${richText} strong > ${code}`, {
    fontWeight: 'bold',
})

globalStyle(`${richText} del ${code}`, {
    textDecoration: 'line-through',
})

// While displaying paragraphs in timeline, we want to have a space between them
globalStyle(`${richText} ${paragraph} + ${paragraph}`, {
    marginTop: vars.space.md,
})

// While typing paragraphs in editor, we want to have the appearance of new para being a new line, so it needs lesser space between them
globalStyle(`${richText}${contentEditable} ${paragraph} + ${paragraph}`, {
    marginTop: vars.space.sm,
})
