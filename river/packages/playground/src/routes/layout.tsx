import { Outlet } from 'react-router-dom'

export const RootLayout = () => {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <header className="border-b border-zinc-200 px-4 py-3">
                <h1 className="text-2xl font-bold">River Playground</h1>
            </header>
            <div className="flex h-full flex-1 flex-col bg-zinc-50 px-4 pt-8">
                <Outlet />
            </div>
        </div>
    )
}
