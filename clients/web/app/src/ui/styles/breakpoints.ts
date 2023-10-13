export const breakpointNames = ['mobile', 'tablet', 'desktop', 'wide'] as const

export const breakpoints = {
    mobile: 0,
    tablet: 740,
    desktop: 992,
    wide: 1500,
} as const

const responsiveConditions = {
    /** default */
    desktop: {},
    /** mobile only */
    mobile: { '@media': `screen and (max-width: ${breakpoints.tablet}px)` },
    /** tablet or smaller */
    tablet: { '@media': `screen and (max-width: ${breakpoints.desktop}px)` },
    /** wider than desktop */
    wide: { '@media': `screen and (min-width: ${breakpoints.wide}px)` },
}

export const responsivePropertiesMixin = {
    conditions: responsiveConditions,
    defaultCondition: 'desktop',
    responsiveArray: ['tablet', 'desktop'],
} as const

export type Breakpoint = keyof typeof breakpoints
