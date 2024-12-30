export const ethPriceAlchemyMock = {
    data: [
        {
            symbol: 'ETH',
            prices: [
                {
                    currency: 'usd',
                    value: '3288.825276856',
                    lastUpdatedAt: '2024-12-20T17:41:51Z',
                },
            ],
        },
    ],
}

export const MOCK_ETH_PRICE = ethPriceAlchemyMock.data[0].prices[0].value
