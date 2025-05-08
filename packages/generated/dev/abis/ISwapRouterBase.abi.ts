export default [
  {
    "type": "event",
    "name": "FeeDistribution",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "treasury",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "poster",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "treasuryAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "posterAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Swap",
    "inputs": [
      {
        "name": "router",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "caller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenIn",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "tokenOut",
        "type": "address",
        "indexed": false,
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
        "name": "recipient",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SwapRouterInitialized",
    "inputs": [
      {
        "name": "spaceFactory",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "SwapRouter__InsufficientOutput",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapRouter__InvalidAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapRouter__InvalidRouter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapRouter__UnexpectedETH",
    "inputs": []
  }
] as const
