import { Navigate, createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './layout'
import { IndexRoute } from './root'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            {
                path: '/',
                element: <IndexRoute />,
            },
            {
                path: '/auth',
                lazy: async () => {
                    const { AuthRoute } = await import('./auth')
                    return {
                        Component: AuthRoute,
                    }
                },
            },
            {
                path: '/t',
                lazy: async () => {
                    const { TLayout } = await import('./t/layout')
                    return {
                        Component: TLayout,
                    }
                },
                errorElement: <Navigate to="/" />,
                children: [
                    {
                        path: '/t/:spaceId',
                        lazy: async () => {
                            const { SpaceRoute } = await import('./t/space')
                            return {
                                Component: SpaceRoute,
                            }
                        },
                        children: [
                            {
                                path: '/t/:spaceId/:channelId',
                                lazy: async () => {
                                    const { ChannelRoute } = await import('./t/channel')
                                    return {
                                        Component: ChannelRoute,
                                    }
                                },
                            },
                        ],
                    },
                ],
            },
            {
                path: 'components',
                lazy: async () => {
                    const { ComponentsRoute } = await import('./components')
                    return {
                        Component: ComponentsRoute,
                    }
                },
            },
        ],
    },
])
