import { Outlet } from 'react-router-dom'
import { LayoutHeader } from '@/components/layout/header'

export const RootLayout = () => {
    return (
        <div className="flex h-[100dvh] flex-col">
            <LayoutHeader />
            <Outlet />
        </div>
    )
}
