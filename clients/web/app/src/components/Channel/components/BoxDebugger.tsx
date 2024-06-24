import debug from 'debug'
import React, { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Box } from '@ui'

export const BoxDebugger = () => {
    const [isToggled, setIsToggled] = useState(false)
    useHotkeys(
        'b',
        () => {
            setIsToggled((prev) => !prev)
        },
        [],
        { enabled: debug.enabled('app:vlist') },
    )
    return isToggled ? <Box background="accent" width="100%" height="200" /> : <></>
}
