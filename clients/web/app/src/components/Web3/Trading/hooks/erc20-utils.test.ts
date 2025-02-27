import { extractTransferAmountFromLogs, generateApproveAmountCallData } from './erc20-utils'

test('generateApproveAmountCallData should generate valid call data', () => {
    const spender = '0x1122331122331122331122331122331122331122'
    const amount = '12345678912345'
    const result = generateApproveAmountCallData(spender, amount)
    expect(result).toEqual(
        '0x095ea7b3000000000000000000000000112233112233112233112233112233112233112200000000000000000000000000000000000000000000000000000b3a73ce5b59',
    )
})

/**
 * Example transaction:
 * https://basescan.org/tx/0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8
 * Token: 0x814fe70e85025bec87d4ad3f3b713bdcaac0579b (based bario)
 * Wallet: 0x5ea3ffb9d07439c15ea1614abfcb79f95e8d9225
 *
 * Note: All logs from the tx are deliberately included in this test,
 * even though we only need the Transfer event logs, as swap logs can be very messy.
 * Swap logs can even contain multiple Transfer events for unrelated tokens, so we need to make sure we're
 * parsing the correct one....
 */
test('extractTransferAmountFromLogs should extract the correct amount', async () => {
    const logs = [
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
            topics: [
                '0x2da466a7b24304f47e87fa2e1e5a81b9831ce54fec19055ce277ca2f39ba42c4',
                '0x0000000000000000000000005ea3ffb9d07439c15ea1614abfcb79f95e8d9225',
            ],
            data: '0x000000000000000000000000000000000000000000000000000003b9609df824',
            logIndex: 2113,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
            topics: ['0xbb47ee3e183a558b1a2ff0874b079f3fc5478b7454eacf2bfc5af2ff5878f972'],
            data: '0x',
            logIndex: 2114,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x6b2C0c7be2048Daa9b5527982C29f48062B34D58',
            topics: ['0x7724394874fdd8ad13292ec739b441f85c6559f10dc4141b8d4c0fa4cbf55bdb'],
            data: '0x0000000000000000000000000000000000000000000000000000000000019e12',
            logIndex: 2115,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x4200000000000000000000000000000000000006',
            topics: [
                '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c',
                '0x0000000000000000000000006b2c0c7be2048daa9b5527982c29f48062b34d58',
            ],
            data: '0x00000000000000000000000000000000000000000000000000005af3107a4000',
            logIndex: 2116,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x4200000000000000000000000000000000000006',
            topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                '0x0000000000000000000000006b2c0c7be2048daa9b5527982c29f48062b34d58',
                '0x000000000000000000000000eea3b956c497d9138a7fdd949b3f3428d5b6d3df',
            ],
            data: '0x00000000000000000000000000000000000000000000000000005af3107a4000',
            logIndex: 2117,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x814fE70e85025BeC87d4Ad3F3b713bDCAAC0579B',
            topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                '0x000000000000000000000000eea3b956c497d9138a7fdd949b3f3428d5b6d3df',
                '0x0000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae',
            ],
            data: '0x00000000000000000000000000000000000000000000000be60272b31808a7c6',
            logIndex: 2118,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x4200000000000000000000000000000000000006',
            topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                '0x000000000000000000000000eea3b956c497d9138a7fdd949b3f3428d5b6d3df',
                '0x00000000000000000000000059bc5d1229880bc4b1dd442db49dd3932a47d0e1',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000045d964b800',
            logIndex: 2119,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0xEEa3b956C497d9138A7FDD949b3F3428D5b6d3Df',
            topics: [
                '0x112c256902bf554b6ed882d2936687aaeb4225e8cd5b51303c90ca6cf43a8602',
                '0x0000000000000000000000009ac7b1ffee0f58c0a3c89aa54afb62efd25dc9fd',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000045d964b8000000000000000000000000000000000000000000000000000000000000000000',
            logIndex: 2120,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0xEEa3b956C497d9138A7FDD949b3F3428D5b6d3Df',
            topics: ['0xcf2aa50876cdfbb541206f89af0ee78d44a2abf8d328e37fa4917f982149848a'],
            data: '0x000000000000000000000000000000000000000000000000080d5660cebaf2e7000000000000000000000000000000000000000000010e708f18842719096865',
            logIndex: 2121,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0xEEa3b956C497d9138A7FDD949b3F3428D5b6d3Df',
            topics: [
                '0xb3e2773606abfd36b5bd91394b3a54d1398336c65005baf7bf7a05efeffaf75b',
                '0x0000000000000000000000009ac7b1ffee0f58c0a3c89aa54afb62efd25dc9fd',
                '0x0000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae',
            ],
            data: '0x00000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000be60272b31808a7c6',
            logIndex: 2122,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x6b2C0c7be2048Daa9b5527982C29f48062B34D58',
            topics: ['0x1bb43f2da90e35f7b0cf38521ca95a49e68eb42fac49924930a5bd73cdf7576c'],
            data: '0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000814fe70e85025bec87d4ad3f3b713bdcaac0579b00000000000000000000000065061d355ae0359ec801e047e40c76051833e78c00000000000000000000000000000000000000000000000000005af3107a400000000000000000000000000000000000000000000000000be60272b31808a7c6',
            logIndex: 2123,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x814fE70e85025BeC87d4Ad3F3b713bDCAAC0579B',
            topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                '0x0000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae',
                '0x0000000000000000000000005ea3ffb9d07439c15ea1614abfcb79f95e8d9225',
            ],
            data: '0x00000000000000000000000000000000000000000000000be60272b31808a7c6',
            logIndex: 2124,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
            topics: ['0x7bfdfdb5e3a3776976e53cb0607060f54c5312701c8cba1155cc4d5394440b38'],
            data: '0x6e1990246612b7b3c37fb5fc8899f0e94ad40c8c47e53163752eb9a75ff267dd0000000000000000000000006b2c0c7be2048daa9b5527982c29f48062b34d580000000000000000000000000000000000000000000000000000000000000000000000000000000000000000814fe70e85025bec87d4ad3f3b713bdcaac0579b00000000000000000000000000000000000000000000000000005af3107a400000000000000000000000000000000000000000000000000be60272b31808a7c60000000000000000000000000000000000000000000000000000000067b83c15',
            logIndex: 2125,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
            topics: [
                '0x38eee76fd911eabac79da7af16053e809be0e12c8637f156e77e1af309b99537',
                '0x6e1990246612b7b3c37fb5fc8899f0e94ad40c8c47e53163752eb9a75ff267dd',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001200000000000000000000000005ea3ffb9d07439c15ea1614abfcb79f95e8d92250000000000000000000000000000000000000000000000000000000000000000000000000000000000000000814fe70e85025bec87d4ad3f3b713bdcaac0579b00000000000000000000000000000000000000000000000000005af3107a400000000000000000000000000000000000000000000000000be60272b31808a7c600000000000000000000000000000000000000000000000000000000000000086c6966692d617069000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a30783030303030303030303030303030303030303030303030303030303030303030303030303030303000000000000000000000000000000000000000000000',
            logIndex: 2126,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
        {
            transactionIndex: 73,
            blockNumber: 26668953,
            transactionHash: '0x5e8610ecc5ba6084cb3e5e7dac55e6d537e5e74c4a1b688f81151ee8b1d23da8',
            address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
            topics: [
                '0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f',
                '0x09b2f2205283ca0cbf205774e19a3ad69a43f2b6ebd25554359ed7d932a6c1f9',
                '0x0000000000000000000000005ea3ffb9d07439c15ea1614abfcb79f95e8d9225',
                '0x0000000000000000000000000000000000000000000000000000000000000000',
            ],
            data: '0x000000000000000000000000000000000000000000000000000000000000009e000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000210a59ea19e000000000000000000000000000000000000000000000000000000000008aece',
            logIndex: 2127,
            blockHash: '0x25167be2b299e1578b05b9bd56608712cac1b8801e6bd4d9d68405dce1e1cd25',
            removed: false,
        },
    ]

    const walletAddress = '0x5ea3ffb9d07439c15ea1614abfcb79f95e8d9225'
    const tokenAddress = '0x814fe70e85025bec87d4ad3f3b713bdcaac0579b'
    const amount = extractTransferAmountFromLogs(logs, walletAddress, tokenAddress)
    expect(amount).toEqual(219488120503009847238n)
})
