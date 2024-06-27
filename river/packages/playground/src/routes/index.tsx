import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './layout'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            {
                path: '/',
                lazy: async () => {
                    const { ConnectRoute } = await import('./root')
                    return {
                        Component: ConnectRoute,
                    }
                },
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
