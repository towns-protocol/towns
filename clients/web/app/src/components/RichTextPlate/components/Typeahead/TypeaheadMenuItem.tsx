import React from 'react'
import { Stack } from 'ui/components/Stack/Stack'
import { Box } from 'ui/components/Box/Box'
import { Text } from 'ui/components/Text/Text'

type TypeaheadMenuItemProps = {
    index: number
    isSelected: boolean
    isLast?: boolean
    onClick: () => void
    onMouseEnter: () => void
    Icon?: JSX.Element
    name?: string
    secondaryText?: string
    trailingContent?: JSX.Element
}
export const TypeaheadMenuItem = React.forwardRef<HTMLDivElement, TypeaheadMenuItemProps>(
    (props, ref) => {
        const { secondaryText, isLast, isSelected, onClick, onMouseEnter } = props

        return (
            <Stack
                horizontal
                gap="sm"
                minHeight="height_lg"
                padding="sm"
                as="li"
                background={isSelected ? 'level4' : 'level2'}
                borderBottom={isLast ? undefined : 'default'}
                tabIndex={-1}
                ref={ref}
                role="option"
                aria-selected={isSelected}
                cursor="pointer"
                alignItems="center"
                onMouseEnter={onMouseEnter}
                onClick={onClick}
            >
                {props.Icon && (
                    <Box centerContent width="x3">
                        {props.Icon}
                    </Box>
                )}
                <Text>{props.name}</Text>
                {secondaryText && (
                    <Text truncate color="gray2">
                        {secondaryText}
                    </Text>
                )}

                {props.trailingContent && (
                    <>
                        <Box grow />
                        <Box justifyContent="center">{props.trailingContent}</Box>
                    </>
                )}
            </Stack>
        )
    },
)
