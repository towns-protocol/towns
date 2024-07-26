import { useRiverAuthStatus } from '@river-build/react-sdk'
import { Block } from '../ui/block'

export const UserAuthStatusBlock = () => {
    const { status } = useRiverAuthStatus()
    return <Block title="User Auth Status">{JSON.stringify(status, null, 2)}</Block>
}
