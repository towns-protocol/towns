import React from 'react'
import { Box, BoxProps } from '@ui'
import * as style from './Spinner.css'

export const Spinner = (props: Omit<BoxProps, 'children'>) => {
    return (
        <Box centerContent aspectRatio="1/1" position="relative" height="input_md" {...props}>
            <svg className={style.circular} viewBox="25 25 50 50">
                <circle
                    className={style.path}
                    cx="50"
                    cy="50"
                    r="23"
                    fill="none"
                    strokeWidth="4"
                    strokeMiterlimit="10"
                    stroke="url(#paint0_linear_1205_31033)"
                />
                <defs>
                    <linearGradient
                        id="paint0_linear_1205_31033"
                        x1="107.232"
                        y1="38.2975"
                        x2="107.232"
                        y2="67.4037"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#21E078FF" />
                        <stop offset="0.364583" stopColor="#1FDBF1FF" />
                        <stop offset="1" stopColor=" #1FDBF100" />
                    </linearGradient>
                </defs>
            </svg>
        </Box>
    )
}
