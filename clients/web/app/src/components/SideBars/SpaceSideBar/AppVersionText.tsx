import React from 'react'

export const AppVersionText = () => {
    return (
        <>
            Towns @ {VITE_APP_COMMIT_HASH}
            <br />
            Released {new Date(VITE_APP_TIMESTAMP).toLocaleDateString()}
        </>
    )
}
