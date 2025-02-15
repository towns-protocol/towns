import { generateApproveAmountCallData } from './erc20-utils'

test('generateApproveAmountCallData should generate valid call data', () => {
    const spender = '0x1122331122331122331122331122331122331122'
    const amount = '12345678912345'
    const result = generateApproveAmountCallData(spender, amount)
    expect(result).toEqual(
        '0x095ea7b3000000000000000000000000112233112233112233112233112233112233112200000000000000000000000000000000000000000000000000000b3a73ce5b59',
    )
})
