import { motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { SVGArcPath } from '../util/SVGArcPath'
import * as styles from './TokenBadgeText.css'

export const BadgeText = (props: { name: string; address?: string }) => (
    <svg width="360" height="360" viewBox="0 0 360 360">
        <g transform="translate(180,180)">
            <TokenText value={props.name} />
            <AddressText value={props.address} />
        </g>
    </svg>
)

const TokenText = ({ id = 'token-text', value }: { id?: string; value: string }) => (
    <>
        <defs>
            <SVGArcPath
                ccw
                radius={152}
                id={`${id}-path`}
                fill="none"
                stroke="white"
                strokeWidth={0}
            />
        </defs>
        <text fill="#fff" className={styles.tokenText}>
            <textPath xlinkHref={`#${id}-path`} startOffset="25%" textAnchor="middle">
                {value}
            </textPath>
        </text>
    </>
)

const AddressText = ({ id = 'address-text', value }: { id?: string; value?: string }) => {
    const [hex, setHex] = useState(
        `${Array(40)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join('')}`,
    )

    const [animateMintIndex, setAnimateIndex] = useState(0)

    useEffect(() => {
        if (value) {
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
    }, [value])

    useEffect(() => {
        if (!value) {
            setAnimateIndex(-1)
        }
    }, [value])

    useEffect(() => {
        if (!value || animateMintIndex > value.length) {
            return
        }
        const interval = setTimeout(() => {
            setAnimateIndex((a) => a + 1)
        }, 10)
        return () => {
            clearTimeout(interval)
        }
    }, [animateMintIndex, value])

    const result = !value
        ? `0x${hex}`
        : (`0x` + hex)
              .split('')
              .map((h, i) => (i > 1 && animateMintIndex > i - 1 ? value[i - 2] : h))
              .join('')

    return (
        <g>
            {`${result}`.split('').map((l, i, arr) => {
                const isMinted = animateMintIndex >= i
                const angle = -Math.PI + (i / arr.length) * Math.PI
                const key = `${isMinted ? `m-` : ``}${i}`
                return (
                    <g
                        key={key}
                        style={{
                            transform: `
                                rotate(${angle + Math.PI / 2}rad)
                                translateY(-132px)
                            `,
                        }}
                    >
                        <Letter angle={angle} minted={isMinted}>
                            {l}
                        </Letter>
                    </g>
                )
            })}
        </g>
    )
}

const Letter = (props: { angle: number; minted: boolean; children: React.ReactNode }) => {
    const { minted: isMinted } = props

    return (
        <motion.text
            fill="#fff"
            className={styles.smallText}
            transition={{
                ease: 'easeOut',
                duration: 0.25,
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
                opacity: isMinted ? 1 : 0.4,
                scale: 1,
            }}
        >
            {props.children}
        </motion.text>
    )
}
