import { defineProperties } from '@vanilla-extract/sprinkles'
import { vars } from 'ui/styles/vars.css'
import { responsivePropertiesMixin } from 'ui/styles/breakpoints'

export const avatarSizes = {
    avatar_xs: {
        width: vars.dims.baseline.x2,
        height: vars.dims.baseline.x2,
        '--size': vars.dims.baseline.x2,
    },
    avatar_sm: {
        width: vars.dims.baseline.x3,
        height: vars.dims.baseline.x3,
        '--size': vars.dims.baseline.x3,
    },
    avatar_x4: {
        width: vars.dims.baseline.x4,
        height: vars.dims.baseline.x4,
        '--size': vars.dims.baseline.x4,
    },
    avatar_md: {
        width: vars.dims.baseline.x6,
        height: vars.dims.baseline.x6,
        '--size': vars.dims.baseline.x6,
    },
    avatar_lg: {
        width: vars.dims.baseline.x8,
        height: vars.dims.baseline.x8,
        '--size': vars.dims.baseline.x8,
    },
    avatar_xl: {
        width: vars.dims.baseline.x20,
        height: vars.dims.baseline.x20,
        '--size': vars.dims.baseline.x20,
    },
    avatar_x15: {
        width: vars.dims.baseline.x15,
        height: vars.dims.baseline.x15,
        '--size': vars.dims.baseline.x15,
    },
    avatar_x10: {
        width: vars.dims.baseline.x10,
        height: vars.dims.baseline.x10,
        '--size': vars.dims.baseline.x10,
    },
    avatar_100: {
        width: '100%',
        height: '100%',
        '--size': '100%',
    },
    toolbar_icon: {
        width: vars.dims.toolbar.toolbar_icon,
        height: vars.dims.toolbar.toolbar_icon,
        '--size': vars.dims.toolbar.toolbar_icon,
    },
} as const

export const avatarProperties = defineProperties({
    ...responsivePropertiesMixin,
    properties: {
        height: avatarSizes,
    },
    shorthands: {
        size: ['height'],
    },
})
