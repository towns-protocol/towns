// TopBar.tsx
import React, { useCallback } from 'react'
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material'
import { ENVIRONMENTS } from 'utils/environment'
import { useSampleAppStore } from 'store/store'
import { useEnvironment } from 'hooks/use-environment'

export function EnvironmentSelect() {
    const { id: environmentId } = useEnvironment()
    const { setEnvironment } = useSampleAppStore()

    const onChangeSelection = useCallback(
        (event: SelectChangeEvent) => {
            setEnvironment(event.target.value as string)
            window.location.href = window.location.protocol + '//' + window.location.host
        },
        [setEnvironment],
    )

    return (
        <FormControl fullWidth size="small">
            <InputLabel id="environment-select-label">Environment:</InputLabel>
            <Select
                size="small"
                labelId="environment-select-label"
                id="environment-select"
                value={environmentId}
                onChange={onChangeSelection}
            >
                {ENVIRONMENTS.map((env) => (
                    <MenuItem key={env.id} value={env.id}>
                        {env.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}
