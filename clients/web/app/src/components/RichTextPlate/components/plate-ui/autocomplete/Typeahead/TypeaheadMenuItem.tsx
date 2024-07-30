import React from 'react'
import { ComboboxItemProps } from '@ariakit/react'
import { Stack } from 'ui/components/Stack/Stack'
import { Box } from 'ui/components/Box/Box'
import { Text } from 'ui/components/Text/Text'
import { typeaheadMenuItem } from './Typeahead.css'

export type TypeaheadMenuItemProps = {
    Icon?: JSX.Element
    secondaryText?: string
    trailingContent?: JSX.Element
} & Omit<ComboboxItemProps, 'color'>

export const TypeaheadMenuItem = React.forwardRef<HTMLDivElement, TypeaheadMenuItemProps>(
    ({ children, Icon, secondaryText, trailingContent, ...props }, ref) => {
        return (
            <Stack
                {...props}
                horizontal
                alignItems="center"
                gap="sm"
                as="div"
                tabIndex={-1}
                ref={ref}
                role="option"
                className={typeaheadMenuItem}
            >
                {Icon && (
                    <Box centerContent width="x3">
                        {Icon}
                    </Box>
                )}
                <Text>{children}</Text>
                {secondaryText && (
                    <Text truncate color="gray2">
                        {secondaryText}
                    </Text>
                )}

                {trailingContent && (
                    <>
                        <Box grow />
                        <Box justifyContent="center">{trailingContent}</Box>
                    </>
                )}
            </Stack>
        )
    },
)
