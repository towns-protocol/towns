import React from 'react'

export const TouchTabBarContext = React.createContext({
    tabBarHidden: false,
    setTabBarHidden: (value: boolean) => {
        /* noop */
    },
})
