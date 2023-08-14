import { defineProperties } from '@vanilla-extract/sprinkles'
import { responsivePropertiesMixin } from 'ui/styles/breakpoints'
import { vars } from 'ui/styles/vars.css'

export const iconProperties = defineProperties({
    ...responsivePropertiesMixin,
    properties: {
        height: {
            square_xxs: {
                width: vars.dims.square.square_xxs,
                height: vars.dims.square.square_xxs,
            },
            square_xs: {
                width: vars.dims.square.square_xs,
                height: vars.dims.square.square_xs,
            },
            square_sm: {
                width: vars.dims.square.square_sm,
                height: vars.dims.square.square_sm,
            },
            square_md: {
                width: vars.dims.square.square_md,
                height: vars.dims.square.square_md,
            },
            square_lg: {
                width: vars.dims.square.square_lg,
                height: vars.dims.square.square_lg,
            },
            square_xl: {
                width: vars.dims.square.square_xl,
                height: vars.dims.square.square_xl,
            },
            square_xxl: {
                width: vars.dims.square.square_xxl,
                height: vars.dims.square.square_xxl,
            },
            square_inline: {
                width: vars.dims.square.square_inline,
                height: vars.dims.square.square_inline,
            },
            toolbar_icon: {
                width: vars.dims.toolbar.toolbar_icon,
                height: vars.dims.toolbar.toolbar_icon,
            },
        },
    },
    shorthands: {
        size: ['height'],
    },
})
