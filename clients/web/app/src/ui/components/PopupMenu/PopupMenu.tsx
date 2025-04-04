import React, { useCallback, useContext, useState } from 'react'
import { Box, BoxProps } from '../Box/Box'
import { CardOpener } from '../Overlay/CardOpener'
import { CardOpenerContext } from '../Overlay/CardOpenerContext'
import { MotionBox } from '../Motion/MotionComponents'

export type Props<T> = {
    value: T
    options: T[]
    onChange?: (value: T) => void
    renderMenu: (item: T, selected?: boolean) => React.ReactNode
    renderButton?: (item: T) => React.ReactNode
    getKey: (item: T) => string
}

export const PopupMenu = <T,>(props: Props<T>) => {
    const {
        options = [],
        getKey,
        renderMenu: renderOption,
        renderButton,
        onChange,
        value: _value,
        ...boxProps
    } = props
    const [value, setValue] = useState(_value)

    const onSelect = useCallback(
        (value: T) => {
            setValue(value)
            onChange?.(value)
        },
        [onChange],
    )

    return (
        <CardOpener
            placement="dropdown"
            render={
                <Box paddingY="sm">
                    <MotionBox
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        background="level2"
                        borderRadius="sm"
                        boxShadow="dropdown"
                        overflow="hidden"
                    >
                        {options.map((t, index) => {
                            return (
                                <PopupMenuOption
                                    renderOption={(option) =>
                                        renderOption(option, getKey(option) === getKey(value))
                                    }
                                    option={t}
                                    key={getKey(t)}
                                    paddingY="sm"
                                    paddingTop={index === 0 ? 'md' : undefined}
                                    paddingBottom={index === options.length - 1 ? 'md' : undefined}
                                    onSelectOption={onSelect}
                                />
                            )
                        })}
                    </MotionBox>
                </Box>
            }
        >
            {({ triggerProps }) => (
                <Box
                    hoverable
                    padding
                    as="button"
                    style={{ userSelect: 'none' }}
                    borderRadius="sm"
                    background="level2"
                    {...boxProps}
                    {...triggerProps}
                >
                    {renderButton ? renderButton(value) : renderOption(value)}
                </Box>
            )}
        </CardOpener>
    )
}

const PopupMenuOption = <T,>(
    props: {
        onSelectOption: (item: T) => void
        option: T
        renderOption: (item: T) => React.ReactNode
    } & BoxProps,
) => {
    const { onSelectOption, option, renderOption, ...boxProps } = props
    const ctx = useContext(CardOpenerContext)
    return (
        <Box
            hoverable
            cursor="pointer"
            background="level2"
            paddingX="md"
            paddingY="sm"
            onClick={() => {
                onSelectOption(option)
                ctx?.closeCard()
            }}
            {...boxProps}
        >
            {renderOption(option)}
        </Box>
    )
}
