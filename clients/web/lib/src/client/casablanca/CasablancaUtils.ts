import { Membership, Stream, StreamMember } from '@towns-protocol/sdk'
import { TownsStreamMember, StreamView } from '../../types/towns-types'

export function toStreamView(stream: Stream, membership: Membership): StreamView {
    const metadata = stream.view.getMemberMetadata()

    const members: TownsStreamMember[] = Array.from(stream.view.getMembers().joined.values()).map(
        (streamMember: StreamMember) => {
            const info = metadata.userInfo(streamMember.userId)
            return {
                userId: streamMember.userId,
                membership: Membership.Join,
                username: info?.username ?? '',
                usernameConfirmed: info?.usernameConfirmed ?? false,
                usernameEncrypted: info?.usernameEncrypted ?? false,
                displayName: info?.displayName ?? '',
                displayNameEncrypted: info?.displayNameEncrypted ?? false,
                disambiguate: false,
            }
        },
    )

    return {
        id: stream.streamId,
        membership: membership,
        members: members,
    }
}
