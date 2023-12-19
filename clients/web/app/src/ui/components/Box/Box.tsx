import { clsx } from 'clsx'
import React, { AllHTMLAttributes, createElement, forwardRef, useMemo } from 'react'
import { scrollContainerClass, scrollbarsClass } from 'ui/styles/globals/scrollcontainer.css'
import { AtomNames, Atoms, atoms, boxClass, containerWithGapClass } from 'ui/styles/atoms.css'
import { debugClass } from 'ui/styles/globals/debug.css'
import { vars } from 'ui/styles/vars.css'
import {
    elevateClass,
    elevateReadabilityClass,
    hoverActiveClass,
    hoverableClass,
} from 'ui/styles/properties/colorProperties.css'
import { zIndexClass } from 'ui/styles/properties/boxProperties.css'

const shorthands = {
    border: [{ border: 'default' }, { border: 'none' }],
    borderLeft: [{ borderLeft: 'default' }, { borderLeft: 'none' }],
    borderRight: [{ borderRight: 'default' }, { borderRight: 'none' }],
    borderTop: [{ borderTop: 'default' }, { borderTop: 'none' }],
    borderBottom: [{ borderBottom: 'default' }, { borderBottom: 'none' }],
    top: [{ top: 'none' }, { top: 'auto' }],
    bottom: [{ bottom: 'none' }, { bottom: 'auto' }],
    left: [{ left: 'none' }, { left: 'auto' }],
    right: [{ right: 'none' }, { right: 'auto' }],
    grow: [{ flexGrow: 'x1' }, { flexGrow: 'x0' }],
    shrink: [{ flexShrink: 'x1' }, { flexShrink: 'x0' }],
    padding: [{ padding: 'md' }, { padding: 'none' }],
    paddingX: [{ paddingX: 'md' }, { paddingX: 'none' }],
    paddingY: [{ paddingY: 'md' }, { paddingY: 'none' }],
    gap: [{ gap: 'md' }, { gap: 'none' }],
    horizontal: [{ flexDirection: 'row' }, { flexDirection: 'column' }],
    centerContent: [{ justifyContent: 'center', alignItems: 'center' }],
    absoluteFill: [{ position: 'absoluteFill' }, {}],
    transition: [{ transition: 'default' }, { transition: 'none' }],
    hoverable: [{}, {}],
    hoverActive: [{}, {}],
    elevate: [{ background: 'level2' }, {}],
    elevateReadability: [{ background: 'default' }, {}],
} as const

const shorhandAttributes = new Set(Object.keys(shorthands))

const defaultAtoms: Atoms = {
    display: 'flex',
    direction: 'column',
} as const

type BaseProps = {
    children?: React.ReactNode
    className?: string
    debug?: boolean
    scroll?: boolean
    scrollbars?: boolean
    style?: React.CSSProperties
}

/**
 * All inherited HTML attributes except the ones colliding with atom props
 * (e.g. width, height, size)
 */
type HTMLProps = Omit<AllHTMLAttributes<HTMLElement>, AtomNames>

type ShorthandAttrs = keyof typeof shorthands

/**
 * List of attributes allowing either a value or a shorthand
 * e.g atom: <Box padding='md' />  shorthand: <Box padding />
 */
type HybridShorthandAttrs = Extract<ShorthandAttrs, AtomNames>

/**
 * List of props that are exclusively related to shorthands
 * e.g. <Box horizontal />
 */
type ExclusiveShorthandProps = {
    [K in Exclude<ShorthandAttrs, HybridShorthandAttrs>]?: boolean
}

// list of atoms without shorthands
type AtomPropsExcludingShorthands = Omit<Atoms, ShorthandAttrs>

// Specific type for atom Props allowing shorthands
type AtomsAllowingShorthands = {
    [K in HybridShorthandAttrs]?: boolean | Atoms[K]
}

type Props = HTMLProps &
    BaseProps &
    Omit<ExclusiveShorthandProps, HybridShorthandAttrs> &
    AtomPropsExcludingShorthands &
    AtomsAllowingShorthands

export type BoxProps = Props

export const Box = forwardRef<HTMLElement, Props>((props: Props, ref) => {
    const { as = 'div', className, children, debug, scroll, scrollbars, ...restProps } = props

    const atomShorthands = useMemo(() => {
        return (Object.entries(shorthands) as Entries<typeof shorthands>).reduce((keep, [s, v]) => {
            if (typeof props[s] === 'boolean') {
                const shorthand = props[s] ? v[0] : v[1]
                keep = { ...keep, ...shorthand }
            }
            return keep
        }, {})
    }, [props])

    /**
     * separate out the atoms from the rest of the props
     */
    const { atomProps, nativeProps } = useMemo(() => {
        const nativeProps: Record<string, unknown> = {}
        const atomProps = (
            Object.keys(restProps) as Array<keyof AtomPropsExcludingShorthands>
        ).reduce((atomProps: Record<string, unknown>, k) => {
            if (atoms.properties.has(k) && typeof k !== 'undefined') {
                atomProps[k] = restProps[k]
            } else {
                // do not forward shorthands to component props
                if (!shorhandAttributes.has(k)) {
                    nativeProps[k] = restProps[k]
                }
            }
            return atomProps
        }, {} as Atoms)

        return {
            nativeProps,
            atomProps,
        }
    }, [restProps])

    const generatedClassNames = clsx([
        boxClass,
        atoms({
            ...defaultAtoms,
            ...atomProps,
            ...atomShorthands,
        }),
        {
            [elevateClass]: props.elevate,
            [hoverableClass]: props.hoverable,
            [hoverActiveClass]: props.hoverActive,
            [elevateReadabilityClass]: props.elevateReadability,
            [containerWithGapClass]: props.gap && props.gap !== vars.space.none,
            [scrollContainerClass]: scroll,
            [scrollbarsClass]: scrollbars,
            [zIndexClass]: props.zIndex,
            [debugClass]: debug,
        },
        className,
    ])

    return createElement(
        as,
        {
            className: generatedClassNames,
            style: props.style,
            ...nativeProps,
            ref,
        },
        children,
    )
})

Box.displayName = 'Box'

// https://stackoverflow.com/questions/60141960/typescript-key-value-relation-preserving-object-entries-type
type Entries<T> = {
    [K in keyof T]: [K, T[K]]
}[keyof T][]
