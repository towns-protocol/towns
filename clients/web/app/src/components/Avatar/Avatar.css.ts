import { style } from '@vanilla-extract/css'
import { createSprinkles } from '@vanilla-extract/sprinkles'
import { vcn } from 'vanilla-classnames'
import { avatarProperties } from 'components/Avatar/avatarProperties.css'
import { vars } from 'ui/styles/vars.css'

/**
 * why not use recipes API ?
 * https://github.com/seek-oss/vanilla-extract/discussions/497
 */

export const avatarBaseStyle = style({
    backgroundSize: 'cover',
    backgroundColor: vars.color.background.level2,
    borderRadius: vars.borderRadius.xs,
})

export const avatarImageStyle = style({
    width: '100%',
    height: '100%',
    objectPosition: 'center',
    objectFit: 'cover',
    aspectRatio: '1/1',
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
    square: style({
        borderRadius: vars.borderRadius.sm,
    }),
    stacked: style({
        boxShadow: `0 0 0 1.5px ${vars.color.layer.level1}`,
        marginLeft: `calc(-0.33 * var(--size))`,
    }),
    noBg: style({
        background: 'none',
    }),
})

export type ToggleProps = Parameters<typeof avatarToggleClasses>[0]

export const avatarAtoms = createSprinkles(avatarProperties)

export type AvatarAtoms = Parameters<typeof avatarAtoms>[0] & ToggleProps
