import React, { ComponentProps, HTMLAttributes, forwardRef } from 'react'
import { useMatch, useResolvedPath } from 'react-router'
import { NavLink } from 'react-router-dom'
import { Box, BoxProps, Stack } from '@ui'
import { navItemBackgroundStyle, navItemLinkStyle } from './_NavItem.css'

type NavLinkProps = {
    to?: string
    exact?: boolean
    active?: boolean
    forceMatch?: boolean
    minHeight?: BoxProps['minHeight']
}

export const NavItem = forwardRef<
    HTMLElement,
    { id?: string; highlight?: boolean; activeBackground?: BoxProps['background'] } & NavLinkProps &
        BoxProps &
        HTMLAttributes<HTMLDivElement>
>(
    (
        {
            id,
            to,
            exact,
            highlight: isHighlight,
            activeBackground,
            forceMatch,
            children,
            minHeight,
            ...props
        },
        ref,
    ) => {
        const resolved = useResolvedPath(`/${to === '/' ? '' : to}`)

        const match =
            useMatch({
                path: resolved.pathname || '/',
                end: to === '/' || exact,
            }) || forceMatch
        const selected = !!match

        return (
            <ConditionalNavLink to={to} className={navItemLinkStyle}>
                <Box hoverable pointerEvents="all">
                    <Stack position="relative" paddingX="sm" paddingY="xs" {...props} ref={ref}>
                        <Stack
                            horizontal
                            grow
                            background={selected ? activeBackground ?? 'level2' : undefined}
                            position="relative"
                            rounded="xs"
                            alignItems="center"
                            gap="sm"
                            minHeight={minHeight ?? 'x6'}
                            paddingX="sm"
                            color={isHighlight || match ? undefined : 'gray2'}
                            className={navItemBackgroundStyle}
                        >
                            {children}
                        </Stack>
                    </Stack>
                </Box>
            </ConditionalNavLink>
        )
    },
)

/**
 * allows `to` prop to be undefined returning children
 **/
export const ConditionalNavLink = ({
    children,
    to,
    ...props
}: Omit<ComponentProps<typeof NavLink>, 'to' | 'children'> & {
    to?: string
    children: JSX.Element
}) =>
    !to ? (
        children
    ) : (
        <NavLink to={to ? to : ''} {...props}>
            {children}
        </NavLink>
    )
