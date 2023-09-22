import React from 'react'
import { Box, Paragraph, Text } from '@ui'

export const DisplayShortcutRow = (props: {
    shortcuts: string[]
    description: string | React.ReactNode
    size?: 'sm' | 'md'
}) => (
    <>
        <Box color="gray1">{props.description}</Box>
        {/* shortcut container (in case there's more than one) */}
        <Box horizontal gap="xs" alignItems="center">
            {props.shortcuts.map((shortcut, i) => (
                <>
                    {i > 0 && (
                        <Box>
                            <Paragraph color="gray2">
                                {i === props.shortcuts.length - 1 ? 'or' : ','}
                            </Paragraph>
                        </Box>
                    )}
                    <ShortcutKeys keys={shortcut} size={props.size} />
                </>
            ))}
        </Box>
    </>
)

export const ShortcutKeys = (props: { keys: string; size?: 'md' | 'sm' }) => {
    const keys = props.keys
        .replace('Meta', '⌘')
        .replace('Backspace', '⌫')
        .replace('Enter', '⏎')
        .replace('ArrowUp', '↑')
        .replace('ArrowDown', '↓ ')

        .split(props.keys.length > 2 ? /[+]/ : '---')
        .map((s, i) => ({ name: s, index: i }))

    return (
        <Box horizontal alignItems="center" gap="xs" fontSize="sm">
            {keys.map(({ name, index }) => (
                <Box horizontal key={index} alignItems="center" gap="xxs">
                    <KeyBox name={name} key={index} size={props.size} />
                </Box>
            ))}
        </Box>
    )
}

const KeyBox = (props: { name: string; size?: 'md' | 'sm' }) => {
    const { size = 'md' } = props
    return (
        <Box
            border
            centerContent
            paddingX="sm"
            minWidth="x3"
            height="x3"
            rounded={size === 'md' ? 'sm' : 'xs'}
            background="level2"
        >
            <Text fontSize={size === 'md' ? 'sm' : 'xs'}>{props.name}</Text>
        </Box>
    )
}
