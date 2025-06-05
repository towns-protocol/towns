export default [
  {
    "type": "function",
    "name": "disableApp",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAppId",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getClients",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getInstalledApps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "installApp",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct IAppAccountBase.AppParams",
        "components": [
          {
            "name": "delays",
            "type": "tuple",
            "internalType": "struct IAppAccountBase.Delays",
            "components": [
              {
                "name": "grantDelay",
                "type": "uint32",
                "internalType": "uint32"
              },
              {
                "name": "executionDelay",
                "type": "uint32",
                "internalType": "uint32"
              }
            ]
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isAppEntitled",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "publicKey",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "permission",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "uninstallApp",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "error",
    "name": "AppAlreadyInstalled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AppNotInstalled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AppNotRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AppRevoked",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidAppAddress",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidAppId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidManifest",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotEnoughEth",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnauthorizedApp",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnauthorizedSelector",
    "inputs": []
  }
] as const
