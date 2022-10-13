import { style } from '@vanilla-extract/css'
import { createSprinkles } from '@vanilla-extract/sprinkles'
import { vcn } from 'vanilla-classnames'
import { avatarProperties } from 'ui/components/Avatar/avatarProperties.css'
import { vars } from 'ui/styles/vars.css'

/**
 * why not use recipes API ?
 * https://github.com/seek-oss/vanilla-extract/discussions/497
 */

export const avatarBaseStyle = style({
    backgroundSize: 'cover',
    borderRadius: vars.borderRadius.xs,
})

export const squircleMask = style({
    WebkitMaskImage: `url(/squircle.svg)`,
    WebkitMaskSize: `cover`,
})

export const avatarToggleClasses = vcn({
    border: style({
        border: `2px solid ${vars.color.layer.level1}`,
    }),
    circle: style({
        borderRadius: vars.borderRadius.full,
    }),
    stacked: style({
        selectors: {
            '&:not(:first-child)': {
                marginLeft: `calc(-0.33 * var(--size))`,
            },
        },
    }),
})

export type ToggleProps = Parameters<typeof avatarToggleClasses>[0]

export const avatarAtoms = createSprinkles(avatarProperties)

export type AvatarAtoms = Parameters<typeof avatarAtoms>[0] & ToggleProps
