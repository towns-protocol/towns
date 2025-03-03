import React from 'react'
import { BoxProps, ButtonText, IconButton, Stack } from '@ui'
import { Icon, IconName } from 'ui/components/Icon'
import { TooltipOptions } from 'ui/components/Tooltip/TooltipRenderer'
import { NavItem } from './_NavItem'

type Props = {
    id?: string
    badge?: React.ReactNode
    label?: React.ReactNode
    link?: string
    icon?: IconName | React.ReactNode
    highlight?: boolean
    tooltip?: React.ReactNode
    tooltipOptions?: TooltipOptions
    minHeight?: BoxProps['minHeight']
    onClick?: (e: React.MouseEvent) => void
    closeAction?: (e: React.MouseEvent) => void
    exact?: boolean
    children?: React.ReactNode
}

export const ActionNavItem = (props: Props) => {
    const {
        icon,
        id,
        link,
        highlight: isHighlight,
        label,
        badge,
        onClick,
        closeAction,
        tooltip,
        tooltipOptions,
        minHeight,
        children,
        exact,
        ...restProps
    } = props

    const isIconName = (icon: Props['icon']): icon is IconName => typeof icon === 'string'

    return (
        <NavItem
            tooltip={tooltip}
            tooltipOptions={tooltipOptions}
            to={link}
            id={id}
            exact={exact}
            cursor="pointer"
            paddingY="xxs"
            minHeight={minHeight}
            onClick={onClick}
            {...restProps}
        >
            {(isIconName(icon) && (
                <Icon
                    type={icon}
                    padding="line"
                    background="level2"
                    color="gray2"
                    size="square_lg"
                />
            )) ||
                icon}
            {!!label && (
                <ButtonText
                    fontWeight={isHighlight ? 'strong' : undefined}
                    color={isHighlight ? 'default' : undefined}
                >
                    {label}
                </ButtonText>
            )}
            <Stack horizontal grow justifyContent="end" alignItems="center" gap="sm">
                {!!badge && badge}
                {closeAction && (
                    <IconButton
                        icon="close"
                        background="none"
                        color={{ hover: 'default', default: 'gray2' }}
                        onClick={(e) => {
                            e.stopPropagation()
                            closeAction(e)
                        }}
                    />
                )}
            </Stack>
            {children}
        </NavItem>
    )
}
