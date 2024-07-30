import { globalStyle, style } from '@vanilla-extract/css'
import { atoms } from 'ui/styles/atoms.css'
import { vars } from 'ui/styles/vars.css'

export const typeaheadMenuWrapper = style([
    atoms({
        border: 'default',
        overflowY: 'auto',
        overflowX: 'hidden',
        rounded: 'sm',
        minWidth: '250',
        maxWidth: '90vw',
        maxHeight: '200',
        background: 'level2',
    }),
    {
        scrollbarWidth: 'none',
        marginBottom: vars.space.sm,
    },
])

export const typeaheadMenuWrapperHidden = style([
    atoms({
        visibility: 'hidden',
    }),
])
export const typeaheadMenuItem = style([
    atoms({
        minHeight: 'height_lg',
        padding: 'sm',
        background: 'level2',
        borderBottom: 'default',
        cursor: 'pointer',
    }),
    {
        userSelect: 'none',
    },
])

globalStyle(`${typeaheadMenuItem}:last-child`, {
    borderBottom: 'none',
})

globalStyle(`${typeaheadMenuItem}[data-active-item]`, {
    background: vars.color.background.level4,
})
