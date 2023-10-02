import React, { useRef, useState } from 'react'
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
    tokens: string[]
}

export function CreateSpaceFormTemp() {
    const { signer } = useWeb3Context()
    const { chainId } = useEnvironment()
    const tokenFieldRef = useRef<HTMLInputElement>(null)

    const [formValue, setFormValue] = useState<FormValues>({
        spaceName: '',
        price: 0,
        limit: 1000,
        tokens: [],
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
        if (event.target.checked) {
            addToken(pioneerNftAddress)
        } else {
            removeToken(pioneerNftAddress)
        }
    }

    function addToken(address: string) {
        const set = new Set([...formValue.tokens, address])
        updateFormValue('tokens', [...set])
        if (tokenFieldRef.current) {
            tokenFieldRef.current.value = ''
        }
    }
    function removeToken(address: string) {
        const set = new Set([...formValue.tokens])
        set.delete(address)
        updateFormValue('tokens', [...set])
    }

    function clearTokens() {
        updateFormValue('tokens', [])
        if (tokenFieldRef.current) {
            tokenFieldRef.current.value = ''
        }
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

        const requirements = {
            name: 'Member',
            price: formValue.price,
            limit: formValue.limit,
            currency: ethers.constants.AddressZero,
            feeRecipient: await signer.getAddress(),
            permissions: [Permission.Read, Permission.Write],
            requirements: {
                everyone: formValue.tokens.length === 0,
                tokens: createExternalTokenStruct(formValue.tokens),
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
        <Stack gap maxWidth="600" alignSelf="center" padding="x8">
            <h1>create space</h1>
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
            <Stack horizontal gap>
                <TextField ref={tokenFieldRef} border="level4" placeholder="Token address" />
                <Button onClick={() => addToken(tokenFieldRef.current?.value ?? '')}>
                    Add Token
                </Button>
                <Button onClick={clearTokens}>Clear tokens</Button>
            </Stack>
            <Checkbox name="pioneer" label="Pioneer gated" onChange={updatePioneerCheckbox} />

            <Stack>
                Gating by:{' '}
                {formValue.tokens.map((addr) => (
                    <Stack key={addr}> {addr}</Stack>
                ))}
            </Stack>

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
