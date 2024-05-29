import React, { MutableRefObject } from 'react'
import { Stack } from 'ui/components/Stack/Stack'
import { Box } from 'ui/components/Box/Box'
import { Text } from 'ui/components/Text/Text'

export class MenuOption {
    key: string
    ref?: MutableRefObject<HTMLElement | null>

    constructor(key: string) {
        this.key = key
        this.ref = { current: null }
        this.setRefElement = this.setRefElement.bind(this)
    }

    setRefElement(element: HTMLElement | null) {
        this.ref = { current: element }
    }
}

export const TypeaheadMenuItem = <T extends MenuOption>(props: {
    index: number
    isSelected: boolean
    isLast?: boolean
    onClick: () => void
    onMouseEnter: () => void
    option: T
    Icon?: JSX.Element
    name?: string
    secondaryText?: string
    trailingContent?: JSX.Element
}) => {
    const { index, secondaryText, isLast, isSelected, onClick, onMouseEnter, option } = props

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
}
