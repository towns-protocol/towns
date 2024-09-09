import { createBrowserRouter } from 'react-router-dom'
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
                    const { SelectSpaceRoute } = await import('./t/spaces')
                    return {
                        Component: SelectSpaceRoute,
                    }
                },
            },
            {
                path: '/t/:spaceId',
                lazy: async () => {
                    const { SelectChannelRoute } = await import('./t/channels')
                    return {
                        Component: SelectChannelRoute,
                    }
                },
                children: [
                    {
                        path: '/t/:spaceId/:channelId',
                        lazy: async () => {
                            const { TimelineRoute } = await import('./t/timeline')
                            return {
                                Component: TimelineRoute,
                            }
                        },
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
