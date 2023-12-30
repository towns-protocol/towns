/**
 * @group main
 */

import { CryptoStore } from '../cryptoStore'
import { UserDevice } from '../olmLib'
import { nanoid } from 'nanoid'

describe('ClientStoreTests', () => {
    let store: CryptoStore
    beforeEach(() => {
        const name = nanoid()
        const userId = nanoid()
        store = new CryptoStore(name, userId)
    })

    test('Add devices to store', async () => {
        const userId = nanoid()
        const userDevice: UserDevice = {
            deviceKey: nanoid(),
            fallbackKey: nanoid(),
        }
        await store.saveUserDevices(userId, [userDevice])
    })

    test('Fetch devices from store', async () => {
        const userId = nanoid()
        const devices = [...Array(10).keys()].map(() => {
            const userDevice: UserDevice = {
                deviceKey: nanoid(),
                fallbackKey: nanoid(),
            }
            return userDevice
        })

        await store.saveUserDevices(userId, devices)

        const fetchedDevices = await store.getUserDevices(userId)
        expect(fetchedDevices.length).toEqual(10)
        expect(fetchedDevices.sort((a, b) => a.deviceKey.localeCompare(b.deviceKey))).toEqual(
            devices.sort((a, b) => a.deviceKey.localeCompare(b.deviceKey)),
        )
    })

    test('Expired devices are not fetched', async () => {
        const userId = nanoid()
        const userDevice: UserDevice = {
            deviceKey: nanoid(),
            fallbackKey: nanoid(),
        }
        const expirationMs = 500
        await store.saveUserDevices(userId, [userDevice], expirationMs)

        const devicesBeforeTimeout = await store.getUserDevices(userId)
        expect(devicesBeforeTimeout.length).toEqual(1)

        await new Promise((resolve) => setTimeout(resolve, expirationMs + 100))
        const devicesAfterTimeout = await store.getUserDevices(userId)
        expect(devicesAfterTimeout.length).toEqual(0)
    })

    test('Adding the same device id twice updates the expiration time', async () => {
        const userId = nanoid()
        const userDevice: UserDevice = {
            deviceKey: nanoid(),
            fallbackKey: nanoid(),
        }
        const expirationMs = 500
        await store.saveUserDevices(userId, [userDevice], expirationMs)
        await new Promise((resolve) => setTimeout(resolve, expirationMs / 2))
        await store.saveUserDevices(userId, [userDevice], expirationMs * 2)

        const deviceCountAfterTwoSaves = await store.deviceRecordCount()
        expect(deviceCountAfterTwoSaves).toEqual(1)

        await new Promise((resolve) => setTimeout(resolve, expirationMs + 100))
        const devicesAfterTimeout = await store.getUserDevices(userId)
        expect(devicesAfterTimeout.length).toEqual(1)
        expect(devicesAfterTimeout[0].deviceKey).toEqual(userDevice.deviceKey)
    })

    // This test is slightly articifical, but the idea is to make sure
    // that expired devices are always purged on init to make sure that the DB
    // doesn't just keep growing. We still need to remember to call initialize()
    test('Expired devices are purged on init', async () => {
        const userId = nanoid()
        const userDevice: UserDevice = {
            deviceKey: nanoid(),
            fallbackKey: nanoid(),
        }
        const expirationMs = 500
        await store.saveUserDevices(userId, [userDevice], expirationMs)

        const countBeforeTimeout = await store.deviceRecordCount()
        expect(countBeforeTimeout).toEqual(1)
        await new Promise((resolve) => setTimeout(resolve, expirationMs + 100))
        const countAfterTimeout = await store.deviceRecordCount()
        expect(countAfterTimeout).toEqual(1)

        await store.initialize()
        const countAfterInitialize = await store.deviceRecordCount()
        expect(countAfterInitialize).toEqual(0)
    })
})
