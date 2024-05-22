import React from 'react'
import { Outlet, Route, Routes } from 'react-router'
import { Stack } from '@ui'
import { UploadImageDebugger } from '@components/UploadImage/UploadImageDebugger'
import { env } from 'utils'
import { PageToken } from './pages/PageToken'
import { VListPlayground } from './pages/VListPlayground'
import { PageColors } from './pages/PageColors'
import { PageTooltips } from './pages/PageTooltips'
import { PageTransactionButton } from './pages/PageTransactionButton'
import { PageButtons } from './pages/PageButtons'
import { PageText } from './pages/PageText'
import { Playground } from './Playground'
import { PageProgressOverlay } from './pages/PageProgressOverlay'

export const PlaygroundRoutes = () => {
    return (
        <Routes>
            <Route element={<PlaygroundMenuLayout />}>
                <Route index element={<Playground />} />
                <Route path="text" element={<PageText />} />
                <Route path="token" element={<PageToken />} />
                <Route path="transaction-button" element={<PageTransactionButton />} />
                <Route path="vlist" element={<VListPlayground />} />
                <Route path="colors" element={<PageColors />} />
                <Route path="tooltips" element={<PageTooltips />} />
                <Route path="buttons" element={<PageButtons />} />
                <Route path="overlays" element={<PageProgressOverlay />} />
                {env.DEV && <Route path="upload" element={<UploadImageDebugger />} />}
            </Route>
        </Routes>
    )
}

const PlaygroundMenuLayout = () => {
    return (
        <Stack overflowY="scroll" overflowX="hidden">
            <Outlet />
        </Stack>
    )
}

export default PlaygroundRoutes
