import { useCallback } from 'react'

type ButtonSelectionProps<O> = {
    option: O
    onSelect: (value: O) => void
    selected: boolean
}

export const ButtonSelection = <T,>(props: {
    value: T | undefined
    options: T[]
    onChange: (value: T | undefined) => void
    selectFn: (v1: T | undefined, v2: T) => boolean
    renderItem: (props: ButtonSelectionProps<T>) => React.ReactNode
}) => {
    const { value, options, renderItem } = props
    const onSelect = useCallback(
        (v: T) => {
            if (value === v) {
                props.onChange(undefined)
            } else {
                props.onChange(v)
            }
        },
        [props, value],
    )
    return options.map((option) =>
        renderItem({
            option,
            onSelect,
            selected: props.selectFn(value, option),
        }),
    )
}
