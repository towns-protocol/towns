import { style } from '@vanilla-extract/css'

export const main = style({
    display: `flex`,
    flexDirection: `column`,
    overflow: `hidden`,
    vars: {
        '--negative-scrollbars': `50px`,
    },
})

export const scrollContainer = style({
    overflowY: `scroll`,
    overflowAnchor: 'none',
    marginRight: `calc(-1 * var(--negative-scrollbars))`,

    selectors: {
        [`&::-webkit-scrollbar`]: {
            display: 'none',
        },
    },
})

export const scrollContent = style({
    position: `relative`,
    overflow: `hidden`,
    width: `calc(100% - var(--negative-scrollbars))`,
    overflowAnchor: 'none',
})

export const listItem = style({
    position: `absolute`,
    width: `100%`,
})
