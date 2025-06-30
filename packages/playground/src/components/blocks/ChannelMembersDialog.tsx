import {
    useMember,
    useMemberList,
    useSyncAgent,
} from '@towns-protocol/react-sdk'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { shortenAddress } from '@/utils/address'
import { Avatar } from '../ui/avatar'
import { ScrollArea } from '../ui/scroll-area'

interface ChannelMembersDialogProps {
    channelId: string
    isOpen: boolean
    onClose: () => void
}

export const ChannelMembersDialog = ({
    channelId,
    isOpen,
    onClose,
}: ChannelMembersDialogProps) => {
    const { data } = useMemberList(channelId)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Channel Members</DialogTitle>
                    <DialogDescription>
                        This is the list of members in the channel.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[500px]">
                    {data?.userIds.length > 0 ? (
                        <ul className="space-y-3">
                            {data.userIds.map((userId) => (
                                <MemberItem
                                    key={userId}
                                    userId={userId}
                                    channelId={channelId}
                                />
                            ))}
                        </ul>
                    ) : (
                        <p className="text-neutral-500">No members found</p>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

const MemberItem = ({
    userId,
    channelId,
}: {
    userId: string
    channelId: string
}) => {
    const sync = useSyncAgent()
    const {
        displayName,
        username,
        isDisplayNameEncrypted,
        isUsernameEncrypted,
    } = useMember({
        streamId: channelId,
        userId,
    })
    return (
        <div className="flex items-center gap-2">
            <Avatar
                key={userId}
                userId={userId}
                className="size-8 rounded-full border border-neutral-200"
            />
            <p
                className="text-sm font-medium data-[state=encrypted]:font-mono"
                data-state={
                    !displayName ||
                    !username ||
                    isDisplayNameEncrypted ||
                    isUsernameEncrypted
                        ? 'encrypted'
                        : 'plain'
                }
            >
                {userId === sync.userId
                    ? 'You'
                    : displayName || username || shortenAddress(userId)}
            </p>
        </div>
    )
}
