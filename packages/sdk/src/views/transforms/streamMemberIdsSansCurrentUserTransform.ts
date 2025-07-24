const EMPTY_RECORD: Record<string, string[] | undefined> = {}

interface Input {
    userId: string
    streamMemberIds: Record<string, string[] | undefined>
}

export function streamMemberIdsSansCurrentUserTransform(
    value: Input,
    prev: Input,
    prevResult?: Record<string, string[] | undefined>,
): Record<string, string[] | undefined> {
    const newResult = { ...prevResult }
    let didUpdate = false
    for (const [streamId, streamMemberIds] of Object.entries(value.streamMemberIds)) {
        if (prev.streamMemberIds[streamId] !== streamMemberIds) {
            didUpdate = true
            if (!streamMemberIds || streamMemberIds?.length === 1) {
                newResult[streamId] = streamMemberIds
            } else {
                newResult[streamId] = streamMemberIds
                    .filter((memberUserId) => memberUserId !== value.userId)
                    .sort((a, b) => a.localeCompare(b))
            }
        }
    }
    if (didUpdate) {
        return newResult
    }
    return prevResult ?? EMPTY_RECORD
}
