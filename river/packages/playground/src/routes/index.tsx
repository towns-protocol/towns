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
                    const { DashboardRoute } = await import('./t/dashboard')
                    return {
                        Component: DashboardRoute,
                    }
                },
            },
            {
                path: '/t/:spaceId',
                lazy: async () => {
                    const { SelectChannelRoute } = await import('./t/space-channels')
                    return {
                        Component: SelectChannelRoute,
                    }
                },
                children: [
                    {
                        path: '/t/:spaceId/:channelId',
                        lazy: async () => {
                            const { ChannelTimelineRoute } = await import('./t/channel-timeline')
                            return {
                                Component: ChannelTimelineRoute,
                            }
                        },
                    },
                ],
            },
            {
                path: '/m',
                lazy: async () => {
                    const { DashboardRoute } = await import('./t/dashboard')
                    return {
                        Component: DashboardRoute,
                    }
                },
                children: [
                    {
                        path: '/m/:gdmStreamId',
                        lazy: async () => {
                            const { GdmTimelineRoute } = await import('./m/gdm-timeline')
                            return {
                                Component: GdmTimelineRoute,
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
            {
                path: 'inspect',
                lazy: async () => {
                    const { InspectRoute } = await import('./inspect/root')
                    return {
                        Component: InspectRoute,
                    }
                },
            },
        ],
    },
])
