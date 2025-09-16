import type { PlainMessage, Snapshot, SnapshotCaseType } from '@towns-protocol/proto'
import type { ParsedStreamResponse, Prettify } from '@towns-protocol/sdk'

// Takes a NonNullable<SnapshotCaseType> and removes the 'Content' suffix
// e.g: userInboxContent -> userInbox
type RemoveContent<T extends string> = T extends `${infer Prefix}Content` ? Prefix : T

// Extract the discriminated union type from Snapshot['content']
type SnapshotContent = Exclude<Snapshot['content'], { case: undefined }>

// Map each snapshot case to its corresponding value type dynamically
type SnapshotTypeMap = {
    [K in SnapshotContent['case']]: Extract<SnapshotContent, { case: K }>['value']
}

// Helper to generate getter function names and types for a specific snapshot type
type GenerateGetters<
    SnapshotCase extends keyof SnapshotTypeMap,
    SnapshotType = PlainMessage<SnapshotTypeMap[SnapshotCase]>,
> = {
    [Prop in NonNullable<
        keyof SnapshotType
    > as `get${Capitalize<RemoveContent<SnapshotCase>>}${Capitalize<string & Prop>}`]: (
        streamId: string,
    ) => Promise<SnapshotType[Prop]>
}

// Helper type to union all getter functions from all snapshot types
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void
    ? I
    : never

// Union all getter functions from all snapshot types dynamically
type GetterFunctions = UnionToIntersection<
    {
        [K in keyof SnapshotTypeMap]: GenerateGetters<K>
    }[keyof SnapshotTypeMap]
>

// Type to get the value type for a specific snapshot case
type SnapshotValueForCase<TCase extends SnapshotCaseType> = TCase extends keyof SnapshotTypeMap
    ? PlainMessage<SnapshotTypeMap[TCase]>
    : never

const getFromSnapshot =
    (getStream: (streamId: string) => Promise<ParsedStreamResponse>) =>
    async <TCase extends SnapshotCaseType, TKey extends keyof SnapshotValueForCase<TCase>>(
        streamId: string,
        snapshotCase: TCase,
        propertyKey: TKey,
    ): Promise<SnapshotValueForCase<TCase>[TKey] | undefined> => {
        const stream = await getStream(streamId)
        if (stream.snapshot.content.case === snapshotCase) {
            const snapshotValue = stream.snapshot.content.value as SnapshotValueForCase<TCase>
            return snapshotValue[propertyKey]
        }
        return undefined
    }

export const SnapshotGetter = (getStream: (streamId: string) => Promise<ParsedStreamResponse>) =>
    new Proxy(
        {},
        {
            get(_target, prop: string) {
                return async (streamId: string) => {
                    // Parse the getter name to extract snapshot type and property
                    const propName = String(prop)

                    // Match pattern like getSpaceInception, getUserMemberships, etc.
                    const match = propName.match(/^get([A-Z][a-z]+)([A-Z][a-zA-Z]+)$/)
                    if (!match) {
                        throw new Error(`Invalid getter name: ${propName}`)
                    }

                    const [, snapshotType, propertyName] = match
                    const snapshotCase =
                        `${snapshotType.toLowerCase()}Content` as keyof SnapshotTypeMap
                    const property = (propertyName.charAt(0).toLowerCase() +
                        propertyName.slice(1)) as keyof SnapshotValueForCase<typeof snapshotCase>

                    return getFromSnapshot(getStream)(streamId, snapshotCase, property)
                }
            },
        },
    ) as Prettify<GetterFunctions>
