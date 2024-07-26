export const jsonStringify = <T>(data: T, space?: string | number) => {
    return JSON.stringify(
        data,
        (_, value) => (typeof value === 'bigint' ? value.toString() : value),
        space,
    )
}
