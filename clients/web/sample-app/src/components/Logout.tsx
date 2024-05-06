import { useCasablancaCredentials, useTownsClient } from 'use-towns-client'

import { Button } from '@mui/material'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

export function Logout(): JSX.Element | null {
    const { isAuthenticated } = useCasablancaCredentials()
    const { logout, clientSingleton, signerContext } = useTownsClient()
    const [deletePersistenceDb, setDeletePersistenceDb] = useState(true)
    const [deleteCryptoDb, setDeleteCryptoDb] = useState(false)

    const persistenceDbName = useMemo(
        () => (signerContext ? clientSingleton?.persistenceDbName(signerContext) : undefined),
        [clientSingleton, signerContext],
    )
    const cryptoDbName = useMemo(
        () => (signerContext ? clientSingleton?.cryptoDbName(signerContext) : undefined),
        [clientSingleton, signerContext],
    )

    useEffect(() => {
        console.log('::logout::', { persistenceDbName, cryptoDbName, clientSingleton })
    }, [persistenceDbName, clientSingleton, cryptoDbName])

    const onLogout = useCallback(
        async function () {
            if (!clientSingleton) {
                console.error('No clientSingleton found')
                return
            }
            await logout()
            if (deletePersistenceDb && persistenceDbName && indexedDB) {
                indexedDB.deleteDatabase(persistenceDbName)
                const deleteRequest = indexedDB.deleteDatabase(persistenceDbName)
                deleteRequest.onerror = function () {
                    console.error('::Error clearing IndexedDB database::' + persistenceDbName)
                }
            }
            if (deleteCryptoDb && cryptoDbName && indexedDB) {
                indexedDB.deleteDatabase(cryptoDbName)
                const deleteRequest = indexedDB.deleteDatabase(cryptoDbName)
                deleteRequest.onerror = function () {
                    console.error('::Error clearing IndexedDB database::' + cryptoDbName)
                }
            }
        },
        [
            clientSingleton,
            cryptoDbName,
            deleteCryptoDb,
            deletePersistenceDb,
            logout,
            persistenceDbName,
        ],
    )

    return isAuthenticated ? (
        <>
            <Button color="primary" variant="contained" onClick={onLogout}>
                Logout
            </Button>
            <label>
                <input
                    type="checkbox"
                    checked={deletePersistenceDb}
                    onChange={(e) => setDeletePersistenceDb(e.target.checked)}
                />
                Delete local persistence database &quot;{persistenceDbName ?? 'undefined'}&quot;
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={deleteCryptoDb}
                    onChange={(e) => setDeleteCryptoDb(e.target.checked)}
                />
                Delete local crypto database &quot;{cryptoDbName ?? 'undefined'}&quot;
            </label>
        </>
    ) : null
}
