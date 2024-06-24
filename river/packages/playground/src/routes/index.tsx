import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './root'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
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
