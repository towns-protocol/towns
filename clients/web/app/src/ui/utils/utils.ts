export const toPx = (value?: string | number) => (typeof value === 'number' ? `${value}px` : value)

export const notUndefined = <T>(x: T | undefined): x is T => {
    return typeof x !== 'undefined'
}

/**
 * Utility to assign default string values if the incoming value is a bool.
 */
export const assignBoolToDefaultValue = <T>(value: boolean | T, trueValue: T, falseValue?: T) => {
    return typeof value !== 'boolean' ? undefined : value === true ? trueValue : falseValue
}
