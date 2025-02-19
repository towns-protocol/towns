import React from 'react'
import { Text } from '@ui'
import { TextProps } from 'ui/components/Text/Text'

const containerStyle = {
    contain: 'layout',
    height: '0.7em',
}

const subStyle = {
    fontSize: '66%',
    marginLeft: `0.0em`,
    marginRight: `0.15em`,
    verticalAlign: 'sub',
}

export const TokenPrice = (
    props: {
        children: string | number
        before?: React.ReactNode
        after?: React.ReactNode
    } & TextProps,
) => {
    const { children, before, after, ...textProps } = props

    const value = typeof children === 'string' ? Number(children) : children

    const formatted = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        minimumSignificantDigits: 2,
        maximumSignificantDigits: 3,
    }).format(value)

    const match = formatted.match(/0\.(0{4,})([1-9]\d*)/)

    return (
        <Text {...textProps} style={containerStyle} title={formatted}>
            {before}
            {!match ? (
                formatted
            ) : (
                <>
                    <span>0.0</span>
                    <span style={subStyle}>{match[1].length}</span>
                    <span>{match[2]}</span>
                </>
            )}
            {after}
        </Text>
    )
}
