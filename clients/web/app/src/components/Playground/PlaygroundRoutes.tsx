import React from 'react'
import { Outlet, Route, Routes } from 'react-router'
import { Stack } from '@ui'
import { UploadImageDebugger } from '@components/UploadImage/UploadImage'
import { PageToken } from './pages/PageToken'

export const PlaygroundRoutes = () => {
    return (
        <Routes>
            <Route element={<PlaygroundMenuLayout />}>
                <Route path="token" element={<PageToken />} />
                <Route path="upload" element={<UploadImageDebugger />} />
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
