import { Outlet, useLocation } from 'react-router-dom'
import { RiverEnvSwitcher } from '@/components/dialog/env-switcher'

export const RootLayout = () => {
    const location = useLocation()
    const isAuthRoute = location.pathname.startsWith('/auth')

    return (
        <div className="flex min-h-screen w-full flex-col">
            <header className="flex justify-between border-b border-zinc-200 px-4 py-3">
                <h1 className="text-2xl font-bold">River Playground</h1>
                {!isAuthRoute && <RiverEnvSwitcher />}
            </header>
            <div className="flex h-full flex-1 flex-col bg-zinc-50 px-4 pb-12 pt-8">
                <Outlet />
            </div>
        </div>
    )
}
