import { MenuOption } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import React from 'react'
import { Stack } from 'ui/components/Stack/Stack'
import { Box } from 'ui/components/Box/Box'
import { Text } from 'ui/components/Text/Text'

export const TypeaheadMenuItem = <T extends MenuOption>(props: {
    index: number
    isSelected: boolean
    isLast?: boolean
    onClick: () => void
    onMouseEnter: () => void
    option: T
    Icon?: JSX.Element
    name?: string
}) => {
    const { index, isLast, isSelected, onClick, onMouseEnter, option } = props

    return (
        <Stack
            horizontal
            gap="sm"
            minHeight="height_lg"
            padding="sm"
            as="li"
            background={isSelected ? 'level4' : 'level2'}
            borderBottom={isLast ? undefined : 'default'}
            key={option.key}
            tabIndex={-1}
            ref={option.setRefElement}
            role="option"
            aria-selected={isSelected}
            id={'typeahead-item-' + index}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
        >
            {props.Icon && (
                <Box centerContent width="x3">
                    {props.Icon}
                </Box>
            )}
            <Box justifyContent="center">
                <Text truncate>{props.name}</Text>
            </Box>
        </Stack>
    )
}
