import React from 'react'
import { Badge } from './layers/TokenBadge'
import { HologramLayer } from './layers/TokenHologram'
import { SpaceTokenShadow } from './layers/TokenShadow'

import * as styles from './SpaceToken.css'

type Props = {
    name?: string
    address?: string
}

export type SpaceTokenProps = Props

export const SpaceToken = (props: Props) => {
    const { name = 'COUNCIL OF ZION', address } = props
    return (
        <div className={styles.container}>
            <SpaceTokenShadow />
            <Badge name={name} address={address} />
            <HologramLayer />
        </div>
    )
}
