import React from 'react'
import { Outlet, Route, Routes } from 'react-router'
import { Stack } from '@ui'
import { UploadImageDebugger } from '@components/UploadImage/UploadImageDebugger'
import { env } from 'utils'
import { PageToken } from './pages/PageToken'
import { VListPlayground } from './pages/VListPlayground'
import { PageColors } from './pages/PageColors'

export const PlaygroundRoutes = () => {
    return (
        <Routes>
            <Route element={<PlaygroundMenuLayout />}>
                <Route path="token" element={<PageToken />} />
                <Route path="vlist" element={<VListPlayground />} />
                <Route path="colors" element={<PageColors />} />
                {env.IS_DEV && <Route path="upload" element={<UploadImageDebugger />} />}
            </Route>
        </Routes>
    )
}

const PlaygroundMenuLayout = () => {
    return (
        <Stack horizontal grow>
            <Stack grow>
                <Outlet />
            </Stack>
        </Stack>
    )
}
