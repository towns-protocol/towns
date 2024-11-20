import { Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import { LayoutHeader } from '@/components/layout/header'
import { ThemeProvider } from '@/components/theme-provider'

export const RootLayout = () => {
    return (
        <ThemeProvider defaultTheme="system">
            <div className="flex h-[100dvh] flex-col">
                <LayoutHeader />
                <Suspense>
                    <Outlet />
                </Suspense>
            </div>
        </ThemeProvider>
    )
}
