'use client'
import { useContext } from 'react'
import { TownsSyncContext } from './TownsSyncContext'
export const useTownsSync = () => useContext(TownsSyncContext)
