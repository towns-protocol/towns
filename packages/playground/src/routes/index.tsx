import { Navigate, createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './layout'
import { IndexRoute } from './root'
import { AuthRoute } from './auth'

export const router = createBrowserRouter([
    {
        path: '/auth',
        element: <RootLayout center noHeader />,
        children: [
            {
                index: true,
                element: <AuthRoute />,
            },
        ],
    },
    {
        path: '/',
        element: <RootLayout />,
        children: [
            {
                index: true,
                element: <IndexRoute />,
            },
            {
                path: '/t',
                lazy: async () => {
                    const { DashboardRoute } = await import('./t/dashboard')
                    return {
                        Component: DashboardRoute,
                    }
                },
                errorElement: <Navigate to="/auth" />,
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
                        path: '/m/gdm/:gdmStreamId',
                        lazy: async () => {
                            const { GdmTimelineRoute } = await import('./m/gdm-timeline')
                            return {
                                Component: GdmTimelineRoute,
                            }
                        },
                    },
                    {
                        path: '/m/dm/:dmStreamId',
                        lazy: async () => {
                            const { DmTimelineRoute } = await import('./m/dm-timeline')
                            return {
                                Component: DmTimelineRoute,
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
