import { motion } from 'framer-motion'
import React, { useEffect, useMemo, useState } from 'react'
import { Box } from '@ui'
import { FontFamily } from 'ui/utils/FontLoader'
import * as styles from '../TownsToken.css'

export const TokenAddress = (props: {
    address?: string
    size: number
    radius: number
    fontSize: number
}) => (
    <Box className={styles.addressContainer}>
        <AddressText
            value={props.address}
            fontSize={props.fontSize}
            size={props.size}
            radius={props.radius}
        />
    </Box>
)

const AddressText = (props: {
    id?: string
    value?: string
    fontSize: number
    size: number
    radius: number
}) => {
    // remove 0x prefix - prepended automatically
    const address = useMemo(
        () => (props.value?.match(/^0x/) ? props.value?.slice(2) : props.value),
        [props.value],
    )

    const [hex, setHex] = useState(
        () =>
            `${Array(40)
                .fill(0)
                .map(() => Math.floor(Math.random() * 16).toString(16))
                .join('')}`,
    )

    const [animateMintIndex, setAnimateIndex] = useState(0)

    useEffect(() => {
        if (address) {
            return
        }
        const interval = setInterval(() => {
            setHex((h) => {
                return h
                    .split('')
                    .map((s, i) =>
                        Math.random() < 0.5 ? Math.floor(Math.random() * 16).toString(16) : s,
                    )
                    .join('')
            })
        }, 250)
        return () => {
            clearInterval(interval)
        }
    }, [address])

    useEffect(() => {
        if (!address) {
            setAnimateIndex(-1)
        }
    }, [address])

    useEffect(() => {
        if (!address || animateMintIndex > address.length) {
            return
        }
        const interval = setTimeout(() => {
            setAnimateIndex((a) => a + 1)
        }, 10)
        return () => {
            clearTimeout(interval)
        }
    }, [animateMintIndex, address])

    const result = useMemo(
        () =>
            !address
                ? `0x${hex}`
                : (`0x` + hex)
                      .split('')
                      .map((h, i) => (i > 1 && animateMintIndex > i - 1 ? address[i - 2] : h))
                      .join(''),
        [address, animateMintIndex, hex],
    )

    return (
        <>
            {`${result}`.split('').map((l, i, arr) => {
                const isMinted = animateMintIndex >= i
                // const angle = (i / arr.length) * Math.PI * 2
                const key = `${isMinted ? `m-` : ``}${i}`

                // 0 - 1 offset on the square, where each quarter is a side
                // this code used to update tick every 100ms, wasting CPU cycles
                const p = (i / arr.length + 0 /* tick */ * 0.0005) % 1

                // size of a side of the square
                const size = props.size
                // cornder radius of the square
                const cornerRadius = props.radius

                let // the normal of the letter
                    letterAngle,
                    // the coords of the letter
                    x = 0,
                    y = 0

                // proportion of the segment covered by the corner
                const mm = (cornerRadius / size) * 1.75
                const getE = (o: number) => (o - mm) / (1 - mm)
                const half = size / 2

                const getLinePos = (offset: number) =>
                    cornerRadius + getE(offset) * (size - cornerRadius * 2)

                // here we go... if somebody feels to code-golf this I'm sure it's
                // possible to a certain extent. Alas, to make it a single function it
                // needs to be rectcircle which is not the case here.

                if (p < 0.25) {
                    // top border
                    const offset = p / 0.25
                    letterAngle = 0
                    x = -half + getLinePos(offset)
                    y = -half

                    if (offset < mm) {
                        // top-left corner
                        const letterOffset = offset / mm
                        x = -half + cornerRadius
                        y = -half + cornerRadius
                        x += Math.cos(-Math.PI + letterOffset * Math.PI * 0.5) * cornerRadius
                        y += Math.sin(-Math.PI + letterOffset * Math.PI * 0.5) * cornerRadius
                        letterAngle = -Math.PI * 0.5 + letterOffset * Math.PI * 0.5
                    }
                } else if (p < 0.5) {
                    // right border
                    const offset = (p - 0.25) / 0.25
                    letterAngle = Math.PI * 0.5
                    x = half
                    y = -half + getLinePos(offset)
                    if (offset < mm) {
                        // top-right corner
                        const letterOffset = offset / mm
                        x = +half - cornerRadius
                        y = -half + cornerRadius
                        x += Math.cos(Math.PI * 1.5 + letterOffset * Math.PI * 0.5) * cornerRadius
                        y += Math.sin(Math.PI * 1.5 + letterOffset * Math.PI * 0.5) * cornerRadius
                        letterAngle = 0 + letterOffset * Math.PI * 0.5
                    }
                } else if (p < 0.75) {
                    // bottom border
                    const offset = (p - 0.5) / 0.25
                    x = half - getLinePos(offset)
                    y = half
                    letterAngle = Math.PI
                    if (offset < mm) {
                        // bottom-right corner
                        const letterOffset = offset / mm
                        x = +half - cornerRadius
                        y = +half - cornerRadius
                        x += Math.cos(Math.PI * 2 + letterOffset * Math.PI * 0.5) * cornerRadius
                        y += Math.sin(Math.PI * 2 + letterOffset * Math.PI * 0.5) * cornerRadius
                        letterAngle = Math.PI * 0.5 + letterOffset * Math.PI * 0.5
                    }
                } else {
                    // left border
                    const offset = (p - 0.75) / 0.25
                    x = -half
                    y = half - getLinePos(offset)
                    letterAngle = Math.PI * 1.5
                    if (offset < mm) {
                        // bottom-left corner
                        const letterOffset = offset / mm
                        x = -half + cornerRadius
                        y = +half - cornerRadius
                        x +=
                            Math.cos(Math.PI * 2.5 + letterOffset * Math.PI * 0.5) *
                            cornerRadius *
                            1
                        y +=
                            Math.sin(Math.PI * 2.5 + letterOffset * Math.PI * 0.5) *
                            cornerRadius *
                            1
                        letterAngle = Math.PI + letterOffset * Math.PI * 0.5
                    }
                }

                return (
                    <Box
                        background="cta2"
                        position="absolute"
                        key={key}
                        style={{
                            width: 0,
                            height: 0,
                            transform: `
                                translate(${x}px, ${y}px)
                                rotate(${1 * letterAngle}rad)
                                scale(${1 + Math.cos(p * Math.PI * 8 - 1) * 0})
                                translate(-3px, -7px)
                                
                            `,
                        }}
                    >
                        <Letter angle={letterAngle} minted={isMinted} fontSize={props.fontSize}>
                            {l.toUpperCase()}
                        </Letter>
                    </Box>
                )
            })}
        </>
    )
}

const Letter = (props: {
    fontSize: number
    angle: number
    minted: boolean
    children: React.ReactNode
}) => {
    const { minted: isMinted } = props

    return (
        <motion.p
            className={styles.letters}
            style={{
                fontFamily: FontFamily.MarketingFont,
                fontSize: props.fontSize,
                fontWeight: 500,
            }}
            transition={{
                ease: 'easeOut',
                duration: 1.25,
            }}
            initial={
                !isMinted
                    ? false
                    : {
                          scale: 2,
                          opacity: 0,
                      }
            }
            animate={{
                opacity: isMinted ? 0.33 : 0.33,
                scale: 1,
            }}
        >
            {props.children}
        </motion.p>
    )
}
