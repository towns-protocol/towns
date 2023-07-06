import React from 'react'
import { Box } from '../Box/Box'
import * as style from './ButtonSpinner.css'

export const ButtonSpinner = () => {
    return (
        <Box position="relative">
            <Box aspectRatio="1/1" height="x2">
                <svg className={style.circular} viewBox="25 25 50 50">
                    <circle
                        className={style.path}
                        cx="50"
                        cy="50"
                        r="22"
                        fill="none"
                        strokeWidth="6"
                        strokeMiterlimit="10"
                        stroke="currentColor"
                    />
                </svg>
            </Box>
        </Box>
    )
}

globalThis.indexedDB
