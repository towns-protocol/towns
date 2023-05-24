import React, { ComponentProps, HTMLAttributes, forwardRef, useContext } from 'react'
import { useMatch, useResolvedPath } from 'react-router'
import { NavLink } from 'react-router-dom'
import { Box, BoxProps, Stack } from '@ui'
import { SidebarContext } from '@components/SideBars/_SideBar'

type NavLinkProps = {
    to?: string
    exact?: boolean
    active?: boolean
    forceMatch?: boolean
}

export const NavItem = forwardRef<
    HTMLElement,
    { id?: string; highlight?: boolean; activeBackground?: BoxProps['background'] } & NavLinkProps &
        BoxProps &
        HTMLAttributes<HTMLDivElement>
>(
    (
        { id, to, exact, highlight: isHighlight, activeBackground, forceMatch, children, ...props },
        ref,
    ) => {
        const resolved = useResolvedPath(`/${to === '/' ? '' : to}`)

        const match =
            useMatch({
                path: resolved.pathname || '/',
                end: to === '/' || exact,
            }) || forceMatch

        const { activeItem, setActiveItem } = useContext(SidebarContext)

        const onMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
            // relays event to custom NavItem implementation (e.g. used by tooltips)
            props.onMouseEnter && props.onMouseEnter(e)
            if (setActiveItem && id) {
                setActiveItem(id)
            }
        }

        const onMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
            props.onMouseLeave && props.onMouseLeave(e)
            if (setActiveItem && id && activeItem === id) {
                setActiveItem(null)
            }
        }

        const isHovered = activeItem === id

        return (
            <ConditionalNavLink to={to}>
                <Box onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                    <Stack position="relative" paddingX="sm" paddingY="xs" {...props} ref={ref}>
                        {/* background fill to highlight element */}
                        <NavItemHighlight
                            selected={!!match}
                            hovered={isHovered}
                            activeBackground={activeBackground}
                            paddingY="xs"
                        />
                        <Stack
                            horizontal
                            grow
                            position="relative"
                            rounded="xs"
                            alignItems="center"
                            gap="sm"
                            minHeight="x6"
                            paddingX="sm"
                            color={isHighlight || match ? undefined : 'gray2'}
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
 * Highlights selected or hovered item
 */

type HighlightProps = {
    selected: boolean
    hovered: boolean
    activeBackground?: BoxProps['background']
} & BoxProps

const NavItemHighlight = (props: HighlightProps) => {
    const { selected, hovered, activeBackground = 'level2', ...boxProps } = props

    const isActive = selected || hovered

    return (
        <Box absoluteFill paddingX="sm" {...boxProps}>
            <Box grow rounded="sm" background={isActive ? activeBackground : undefined} />
        </Box>
    )
}

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
