import React, { SVGProps, forwardRef } from 'react'

type SVGArcCircleProps = {
    radius: number
    ccw?: boolean
} & SVGProps<SVGPathElement>

export const SVGArcPath = forwardRef<SVGPathElement, SVGArcCircleProps>((props, ref) => {
    const { radius, ccw = false, ...svgProps } = props
    return (
        <path
            {...svgProps}
            d={`
                M 0 0
                m ${-radius}, 0
                a ${radius},${radius} 0 ${ccw ? `1,0` : `0,1`} ${radius * 2},0
                a ${radius},${radius} 0 ${ccw ? `1,0` : `0,1`} ${-radius * 2},0
              `}
        />
    )
})
