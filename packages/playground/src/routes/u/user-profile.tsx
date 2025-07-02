import { useParams, useNavigate } from 'react-router-dom'
import { useMember } from '@towns-protocol/react-sdk'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { shortenAddress } from '@/utils/address'

export const UserProfileRoute = () => {
    const { userId } = useParams<{ userId: string }>()
    const navigate = useNavigate()
    
    if (!userId) {
        return <div>User not found</div>
    }

    return (
        <div className="container mx-auto max-w-2xl p-6">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="mb-4"
                >
                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <UserProfile userId={userId} />
            </div>
        </div>
    )
}

const UserProfile = ({ userId }: { userId: string }) => {
    const { username, displayName, ensAddress, nft, membership } = useMember({
        streamId: userId,
        userId: userId,
    })

    const prettyDisplayName = displayName || username
    const displayUserId = shortenAddress(userId)

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Avatar userId={userId} className="h-20 w-20" />
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">
                        {prettyDisplayName || displayUserId}
                    </h1>
                    {prettyDisplayName && (
                        <p className="text-sm text-muted-foreground font-mono">
                            {displayUserId}
                        </p>
                    )}
                    {ensAddress && (
                        <p className="text-sm text-muted-foreground">
                            ENS: {ensAddress}
                        </p>
                    )}
                </div>
            </div>
            
            {membership && (
                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">Membership</h3>
                    <pre className="text-sm text-muted-foreground">
                        {JSON.stringify(membership, null, 2)}
                    </pre>
                </div>
            )}
            
            {nft && (
                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">NFT</h3>
                    <pre className="text-sm text-muted-foreground">
                        {JSON.stringify(nft, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    )
}
