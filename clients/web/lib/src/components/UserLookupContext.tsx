import React from 'react'
import { UserLookupContextType } from 'types/user-lookup'

export const UserLookupContext = React.createContext<UserLookupContextType | null>(null)
