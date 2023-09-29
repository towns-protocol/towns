import React, { useState } from 'react'
import {
    CreateSpaceInfo,
    Permission,
    RoomVisibility,
    createExternalTokenStruct,
    getPioneerNftAddress,
    useCreateSpaceTransaction,
    useWeb3Context,
} from 'use-zion-client'
import { ethers } from 'ethers'
import { Button, Checkbox, Stack, TextField } from '@ui'
import { useEnvironment } from 'hooks/useEnvironmnet'

type FormValues = {
    spaceName: string
    price: number
    limit: number
    pioneerGated: boolean
}

export function CreateSpaceFormTemp() {
    const { signer } = useWeb3Context()
    const { chainId } = useEnvironment()

    const [formValue, setFormValue] = useState<FormValues>({
        spaceName: '',
        price: 0,
        limit: 1000,
        pioneerGated: false,
    })

    const pioneerNftAddress = getPioneerNftAddress(chainId)

    function updateFormValue<P extends keyof FormValues>(property: P, value: FormValues[P]) {
        setFormValue((prevFormValue: FormValues) => ({
            ...prevFormValue,
            [property]: value,
        }))
    }

    const {
        isLoading,
        data: roomId,
        transactionHash,
        transactionStatus,
        error,
        createSpaceTransactionWithRole,
    } = useCreateSpaceTransaction()

    function updateName(event: React.ChangeEvent<HTMLInputElement>) {
        updateFormValue('spaceName', event.target.value)
    }

    function updatePrice(event: React.ChangeEvent<HTMLInputElement>) {
        updateFormValue('price', Number(event.target.value))
    }

    function updateLimit(event: React.ChangeEvent<HTMLInputElement>) {
        updateFormValue('limit', Number(event.target.value))
    }

    function updatePioneerCheckbox(event: React.ChangeEvent<HTMLInputElement>) {
        updateFormValue('pioneerGated', event.target.checked)
    }

    async function createSpace() {
        const createSpaceInfo: CreateSpaceInfo = {
            name: formValue.spaceName,
            visibility: RoomVisibility.Public,
        }
        if (!signer) {
            console.error('Cannot create space. No signer.')
            return undefined
        }
        const isPioneerGated = formValue.pioneerGated

        const requirements = {
            name: 'Member',
            price: formValue.price,
            limit: formValue.limit,
            currency: ethers.constants.AddressZero,
            feeRecipient: await signer.getAddress(),
            permissions: [Permission.Read, Permission.Write],
            requirements: {
                everyone: !isPioneerGated,
                tokens: isPioneerGated ? createExternalTokenStruct([pioneerNftAddress]) : [],
                users: [],
            },
        }
        console.log('submitting values: ', {
            createSpaceInfo,
            requirements,
        })

        await createSpaceTransactionWithRole(createSpaceInfo, requirements)
    }

    return (
        <Stack gap>
            <h1>create casablanca space</h1>
            <TextField border="level4" placeholder="name" onChange={updateName} />
            <TextField
                border="level4"
                placeholder="limit"
                defaultValue={formValue.limit}
                onChange={updateLimit}
            />
            <TextField
                border="level4"
                placeholder="price"
                defaultValue={formValue.price}
                onChange={updatePrice}
            />
            <Checkbox name="pioneer" label="Pioneer gated" onChange={updatePioneerCheckbox} />

            <Button disabled={!formValue.spaceName} onClick={createSpace}>
                Create Space
            </Button>

            <p>Transaction Hash: {transactionHash}</p>
            <p>Transaction Status: {transactionStatus}</p>
            <p>Error: {JSON.stringify(error)}</p>
            <p>Room Id: {roomId?.networkId}</p>
            <p>{isLoading ? 'Loading...' : ''}</p>
        </Stack>
    )
}
