import { RecipeVariants, recipe } from '@vanilla-extract/recipes'
import { atoms } from 'ui/styles/atoms.css'
import { vars } from 'ui/styles/vars.css'

export const buttonStyle = recipe({
    base: {
        border: 'none',
        whiteSpace: 'nowrap',
        borderRadius: vars.borderRadius.xs,
        transition: 'box-shadow 1s',

        selectors: {
            '&:hover:enabled': {
                transition: 'box-shadow 320ms',
                boxShadow: `0 0 0px 1px ${vars.color.tone.cta1}`,
            },
            '&:disabled': {
                opacity: 0.5,
            },
        },
    },
    defaultVariants: {
        size: 'button_md',
    },
    variants: {
        rounded: {
            sm: {
                borderRadius: vars.borderRadius.sm,
            },
            md: {
                borderRadius: vars.borderRadius.md,
            },
        },
        size: {
            inline: {
                padding: atoms({ padding: 'none' }),
                selectors: {
                    '&:hover:enabled': {
                        transition: 'none',
                        boxShadow: `none`,
                    },
                },
            },
            button_xs: {
                fontSize: vars.fontSize.sm,
                height: vars.dims.button.button_xs,
                fontVariationSettings: vars.fontVariationSettings.medium,
                paddingLeft: `calc(${vars.space.sm} * 1.33)`,
                paddingRight: `calc(${vars.space.sm} * 1.33)`,
                gap: vars.space.sm,
            },
            button_sm: {
                fontSize: vars.fontSize.sm,
                height: vars.dims.button.button_sm,
                fontVariationSettings: vars.fontVariationSettings.medium,
                paddingLeft: vars.space.md,
                paddingRight: vars.space.md,
                gap: vars.space.sm,
            },
            button_md: {
                fontSize: vars.fontSize.md,
                height: vars.dims.button.button_md,
                fontVariationSettings: vars.fontVariationSettings.medium,
                paddingLeft: vars.dims.baseline.x3,
                paddingRight: vars.dims.baseline.x3,
                gap: vars.space.sm,
            },
            button_lg: {
                fontSize: vars.fontSize.lg,
                fontVariationSettings: vars.fontVariationSettings.medium,
                height: vars.dims.button.button_lg,
                padding: vars.space.md,
                paddingLeft: vars.space.lg,
                paddingRight: vars.space.lg,
                gap: vars.space.md,
            },
        },
        hoverEffect: {
            none: {
                selectors: {
                    '&:hover:enabled': {
                        transition: 'none',
                        boxShadow: `none`,
                    },
                },
            },
        },
    },
})

export type ButtonStyleVariants = RecipeVariants<typeof buttonStyle>
