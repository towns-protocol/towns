import { defineProperties } from '@vanilla-extract/sprinkles'
import { responsivePropertiesMixin } from 'ui/styles/breakpoints'
import { vars } from 'ui/styles/vars.css'

export const typeProperties = defineProperties({
    ...responsivePropertiesMixin,
    properties: {
        fontWeight: vars.fontWeight,
        fontSize: vars.fontSize,
        textAlign: vars.textAlign,
        textTransform: vars.textTransform,
        textDecoration: vars.textDecoration,
        fontStyle: ['normal', 'italic'],
    },
    shorthands: {
        // fontWeight: ["fontVariationSettings"],
    },
})
