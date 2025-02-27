import { useEffect } from 'react'

// I put too much stuff in localStorage, this lets us clean things up
export function LocalStorageMigrator() {
    useEffect(() => {
        const migrations = [
            (localStorage: Storage) => localStorage.removeItem('towns/channelData'),
            // add new migrations here
        ]
        const key = 'towns/storage-version'
        const currentVersion = migrations.length.toString()
        const localStorage = window.localStorage
        const version = localStorage.getItem(key)

        if (version !== currentVersion) {
            const versionIndex = version ? parseInt(version) : 0
            for (let i = versionIndex; i < migrations.length; i++) {
                console.log(`[LocalStorageMigrator] running migration ${i}`)
                migrations[i](localStorage)
            }
            localStorage.setItem(key, currentVersion)
        }
    }, [])
    return null
}
