import { Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import { LayoutHeader } from '@/components/layout/header'

export const RootLayout = () => {
    return (
        <div className="flex h-[100dvh] flex-col">
            <LayoutHeader />
            <Suspense>
                <Outlet />
            </Suspense>
        </div>
    )
}
