import { useRiver, useRiverAuthStatus } from '@river-build/react-sdk'
import { Block } from '../ui/block'

export const UserStatusBlock = () => {
    const { status } = useRiverAuthStatus()
    const { data } = useRiver((s) => s.user)
    return (
        <Block title="User">
            <pre className="overflow-auto whitespace-pre-wrap">
                {JSON.stringify(status, null, 2)}
            </pre>
            <span className="text-sm font-medium">userId:</span>
            <pre className="text-sm">{data.id}</pre>
        </Block>
    )
}
