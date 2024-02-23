import { globalStyle, style } from '@vanilla-extract/css'
import { atoms } from 'ui/styles/atoms.css'
import { scrollContainerClass } from 'ui/styles/globals/scrollcontainer.css'
import { baseline, vars } from 'ui/styles/vars.css'

export const richText = style([
    atoms({
        position: 'relative',
    }),
])

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

export const root = style({})

export const paragraph = style({})

export const link = style([
    atoms({
        color: 'cta2',
    }),
])
export const mentionInput = style([
    atoms({
        display: 'inline-block',
        fontWeight: 'medium',
        background: { default: 'level2', hover: 'hover' },
        border: { default: 'level3', hover: 'level4' },
        rounded: 'xs',
        fontSize: { desktop: 'md', mobile: 'mds' },
        cursor: 'pointer',
        color: 'default',
        insetY: 'xxs',
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
    listStylePosition: 'inside',
    listStyleType: 'decimal',
})

export const listitem = style({
    margin: `${vars.space.none} ${vars.space.none}`,
})

export const nestedListItem = style({
    listStyleType: 'none',
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
        border: 'level3',
    }),
    {
        fontFamily: 'monospace',
        fontSize: vars.fontSize.sm,
        tabSize: vars.space.md,
    },
])

export const quote = style({
    marginTop: vars.space.md,
    marginBottom: vars.space.md,
    marginLeft: vars.space.md,
})

export const singleEmojiMessage = style({})
globalStyle(`${richText}${singleEmojiMessage} p`, {
    fontSize: `calc(${vars.fontSize.md} * 3)`,
    lineHeight: 1.5,
})

globalStyle(`${richText} ul ul, ${richText} ul ol`, {
    marginLeft: vars.space.md,
})
globalStyle(`${richText} ol ul, ${richText} ol ol`, {
    marginLeft: vars.space.md,
})

globalStyle(`${richText} ul > ${listitem}:not(${listitemCheckedShared}) `, {
    marginLeft: vars.space.md,
})

globalStyle(`${richText} ${paragraph} + ${paragraph}`, {
    marginTop: vars.space.md,
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
