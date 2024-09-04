import { useRiverConnection } from '@river-build/react-sdk'
import { Navigate } from 'react-router-dom'

export const IndexRoute = () => {
    const { isConnected: isRiverConnected } = useRiverConnection()

    if (isRiverConnected) {
        return <Navigate to="/t" />
    } else {
        return <Navigate to="/auth" />
    }
}
