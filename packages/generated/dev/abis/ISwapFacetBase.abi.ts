export default [
  {
    "type": "event",
    "name": "SwapExecuted",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenIn",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenOut",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amountIn",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amountOut",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "poster",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SwapFeeConfigUpdated",
    "inputs": [
      {
        "name": "posterFeeBps",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "forwardPosterFee",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "SwapFacet__InvalidPosterInput",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapFacet__SwapRouterNotSet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapFacet__TotalFeeTooHigh",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapFacet__UnexpectedETH",
    "inputs": []
  }
] as const
