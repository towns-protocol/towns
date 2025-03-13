import React, { createContext, useContext, useState } from 'react'

export type View = 'payCard' | 'payEth' | 'depositEth' | undefined

type UserOpTxModalContext = {
    view: View
    setView: (view: View) => void
}

const UserOpTxModalContext = createContext<UserOpTxModalContext | undefined>(undefined)

export function UserOpTxModalProvider(props: { children: React.ReactNode }) {
    const [view, setView] = useState<View>(undefined)

    return (
        <UserOpTxModalContext.Provider
            value={{
                view,
                setView,
            }}
        >
            {props.children}
        </UserOpTxModalContext.Provider>
    )
}

export function useUserOpTxModalContext() {
    const context = useContext(UserOpTxModalContext)
    if (!context) {
        throw new Error('useUserOpTxModalContext must be used within a UserOpTxModalProvider')
    }
    return context
}

export const isPayWithCard = (view: View) => view === 'payCard'
export const isPayWithEth = (view: View) => view === 'payEth'
export const isDepositEth = (view: View) => view === 'depositEth'
