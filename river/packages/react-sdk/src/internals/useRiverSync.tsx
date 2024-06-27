'use client'
import { useContext } from 'react'
import { RiverSyncContext } from './RiverSyncContext'
export const useRiverSync = () => useContext(RiverSyncContext)
