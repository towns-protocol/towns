import { globalStyle, style } from '@vanilla-extract/css'
import { atoms } from 'ui/styles/atoms.css'
import { vars } from 'ui/styles/vars.css'

export const richText = style({})

export const contentEditable = style([
    atoms({
        paddingY: 'md',
    }),
    {
        outline: 'none',
    },
])

export const root = style({})

export const paragraph = style({})

export const ul = style({
    margin: `${vars.space.xs} 0`,
    padding: 0,
    listStylePosition: 'outside',
})

export const ol = style({
    margin: `${vars.space.xs} 0`,
    padding: 0,
    listStylePosition: 'inside',
})

export const listitem = style({
    margin: `${vars.space.none} ${vars.space.none}`,
})

export const ol1 = style({
    listStyleType: 'decimal',
})
export const ol2 = style({
    listStyleType: 'lower-alpha',
})
export const ol3 = style({
    listStyleType: 'lower-roman',
})
export const ol4 = style({
    listStyleType: 'decimal',
})

export const ul1 = style({
    listStyleType: 'disc',
})
export const ul2 = style({
    listStyleType: 'square',
})
export const ul3 = style({
    listStyleType: 'disc',
})
export const ul4 = style({
    listStyleType: 'square',
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

export const code = style({
    fontFamily: 'monospace',
    marginTop: vars.space.sm,
    marginBottom: vars.space.sm,
    fontSize: vars.fontSize.sm,
    tabSize: vars.space.md,
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
