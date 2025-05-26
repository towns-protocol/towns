import { Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import { LayoutHeader } from '@/components/layout/header'
import { ThemeProvider } from '@/components/theme-provider'
import { cn } from '@/utils'

export const RootLayout = (props: { center?: boolean; noHeader?: boolean }) => {
    return (
        <ThemeProvider defaultTheme="system">
            <div
                className={cn(
                    'grid h-[100dvh]',
                    !props.center && !props.noHeader && 'grid-rows-[auto_1fr]',
                )}
            >
                {!props.noHeader && <LayoutHeader />}
                <Suspense>
                    {props.center ? (
                        <main className="grid h-full place-items-center">
                            <Outlet />
                        </main>
                    ) : (
                        <Outlet />
                    )}
                </Suspense>
            </div>
        </ThemeProvider>
    )
}
