import { Primitive, z } from 'zod'

/**
 * Constructs a Zod union type from a const array of primitive values.
 *
 * @example
 * const options = ['fixed', 'dynamic'] as const
 * const schema = constructZodLiteralUnionType(options)
 * // Creates z.union([z.literal('fixed'), z.literal('dynamic')])
 */
export function zodUnionFromArray<T extends Primitive>(constArray: readonly T[]) {
    const literalsArray = constArray.map((literal) => z.literal(literal))
    if (!isValidZodLiteralUnion(literalsArray)) {
        throw new Error(
            'Literals passed do not meet the criteria for constructing a union schema, the minimum length is 2',
        )
    }
    return z.union(literalsArray)
}

export function isValidZodLiteralUnion<T extends z.ZodLiteral<unknown>>(
    literals: T[],
): literals is [T, T, ...T[]] {
    return literals.length >= 2
}
