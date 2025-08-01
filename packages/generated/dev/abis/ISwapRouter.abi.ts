export default [
  {
    "type": "function",
    "name": "executeSwap",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct ISwapRouterBase.ExactInputParams",
        "components": [
          {
            "name": "tokenIn",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "tokenOut",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amountIn",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minAmountOut",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "name": "routerParams",
        "type": "tuple",
        "internalType": "struct ISwapRouterBase.RouterParams",
        "components": [
          {
            "name": "router",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "approveTarget",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "swapData",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "poster",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "amountOut",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "protocolFee",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "executeSwapWithPermit",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct ISwapRouterBase.ExactInputParams",
        "components": [
          {
            "name": "tokenIn",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "tokenOut",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amountIn",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minAmountOut",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "name": "routerParams",
        "type": "tuple",
        "internalType": "struct ISwapRouterBase.RouterParams",
        "components": [
          {
            "name": "router",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "approveTarget",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "swapData",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "posterFee",
        "type": "tuple",
        "internalType": "struct ISwapRouterBase.FeeConfig",
        "components": [
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "feeBps",
            "type": "uint16",
            "internalType": "uint16"
          }
        ]
      },
      {
        "name": "permit",
        "type": "tuple",
        "internalType": "struct ISwapRouterBase.Permit2Params",
        "components": [
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "nonce",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "signature",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "amountOut",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "protocolFee",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getETHInputFees",
    "inputs": [
      {
        "name": "amountIn",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "caller",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "poster",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "amountInAfterFees",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "protocolFee",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "posterFee",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPermit2MessageHash",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct ISwapRouterBase.ExactInputParams",
        "components": [
          {
            "name": "tokenIn",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "tokenOut",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amountIn",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "minAmountOut",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "name": "routerParams",
        "type": "tuple",
        "internalType": "struct ISwapRouterBase.RouterParams",
        "components": [
          {
            "name": "router",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "approveTarget",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "swapData",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "posterFee",
        "type": "tuple",
        "internalType": "struct ISwapRouterBase.FeeConfig",
        "components": [
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "feeBps",
            "type": "uint16",
            "internalType": "uint16"
          }
        ]
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "messageHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPermit2Nonce",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "startNonce",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
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
        "name": "protocol",
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
        "name": "protocolAmount",
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
    "name": "SwapRouter__InvalidBps",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapRouter__InvalidRouter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapRouter__NativeTokenNotSupportedWithPermit",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapRouter__PosterFeeMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapRouter__RecipientRequired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapRouter__SameToken",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SwapRouter__UnexpectedETH",
    "inputs": []
  }
] as const
