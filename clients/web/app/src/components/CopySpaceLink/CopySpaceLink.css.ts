import { style } from '@vanilla-extract/css'
import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { atoms } from 'ui/styles/atoms.css'
import { vars } from 'ui/styles/vars.css'

export const spaceLinkCopy = style({
    whiteSpace: 'nowrap',
    fontSize: vars.fontSize.md,
})

export const spaceUrlText = style({
    color: vars.color.foreground.gray2,
})
const spaceLinkVariants = {
    align: {
        left: atoms({ left: 'none' }),
        right: atoms({ right: 'none' }),
    },
    offsetTop: {
        sm: atoms({ top: 'sm' }),
        md: atoms({ top: 'md' }),
    },
}

export const tooltipBoxStyles = recipe({
    base: atoms({
        position: 'absolute',
        padding: 'md',
        borderRadius: 'sm',
        background: 'level2',
        border: 'default',
    }),
    defaultVariants: {
        align: 'left',
        offsetTop: 'sm',
    },
    variants: {
        align: spaceLinkVariants.align,
        offsetTop: spaceLinkVariants.offsetTop,
    },
})

export type TooltipBoxVariants = RecipeVariants<typeof tooltipBoxStyles>
