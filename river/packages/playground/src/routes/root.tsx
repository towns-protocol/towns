import { useAgentConnection } from '@river-build/react-sdk'
import { Navigate } from 'react-router-dom'
import { DashboardRoute } from './t/dashboard'

export const IndexRoute = () => {
    const { isAgentConnected } = useAgentConnection()

    if (isAgentConnected) {
        return <DashboardRoute />
    }
    return <Navigate to="/auth" />
}
