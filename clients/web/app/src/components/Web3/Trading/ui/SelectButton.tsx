import { useCallback } from 'react'

type ButtonSelectionProps<O> = {
    option: O
    onSelect: (value: O) => void
    selected: boolean
}

export const ButtonSelection = <T,>(props: {
    value: T | undefined
    options: T[]
    onChange: (value: T) => void
    renderItem: (props: ButtonSelectionProps<T>) => React.ReactNode
}) => {
    const { value, options, renderItem } = props
    const onSelect = useCallback(
        (value: T) => {
            props.onChange(value)
        },
        [props],
    )
    return options.map((option) => renderItem({ option, onSelect, selected: value === option }))
}
