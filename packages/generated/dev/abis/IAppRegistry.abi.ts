export default [
  {
    "type": "function",
    "name": "adminBanApp",
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
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "adminRegisterAppSchema",
    "inputs": [
      {
        "name": "schema",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "resolver",
        "type": "address",
        "internalType": "contract ISchemaResolver"
      },
      {
        "name": "revocable",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createApp",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct IAppRegistryBase.AppParams",
        "components": [
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "permissions",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          },
          {
            "name": "client",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "installPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "accessDuration",
            "type": "uint48",
            "internalType": "uint48"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "appId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getAppByClient",
    "inputs": [
      {
        "name": "client",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAppById",
    "inputs": [
      {
        "name": "appId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IAppRegistryBase.App",
        "components": [
          {
            "name": "appId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "module",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "owner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "client",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "permissions",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          },
          {
            "name": "manifest",
            "type": "tuple",
            "internalType": "struct ExecutionManifest",
            "components": [
              {
                "name": "executionFunctions",
                "type": "tuple[]",
                "internalType": "struct ManifestExecutionFunction[]",
                "components": [
                  {
                    "name": "executionSelector",
                    "type": "bytes4",
                    "internalType": "bytes4"
                  },
                  {
                    "name": "skipRuntimeValidation",
                    "type": "bool",
                    "internalType": "bool"
                  },
                  {
                    "name": "allowGlobalValidation",
                    "type": "bool",
                    "internalType": "bool"
                  }
                ]
              },
              {
                "name": "executionHooks",
                "type": "tuple[]",
                "internalType": "struct ManifestExecutionHook[]",
                "components": [
                  {
                    "name": "executionSelector",
                    "type": "bytes4",
                    "internalType": "bytes4"
                  },
                  {
                    "name": "entityId",
                    "type": "uint32",
                    "internalType": "uint32"
                  },
                  {
                    "name": "isPreHook",
                    "type": "bool",
                    "internalType": "bool"
                  },
                  {
                    "name": "isPostHook",
                    "type": "bool",
                    "internalType": "bool"
                  }
                ]
              },
              {
                "name": "interfaceIds",
                "type": "bytes4[]",
                "internalType": "bytes4[]"
              }
            ]
          },
          {
            "name": "duration",
            "type": "uint48",
            "internalType": "uint48"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAppDuration",
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
        "type": "uint48",
        "internalType": "uint48"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAppPrice",
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
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAppSchema",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAppSchemaId",
    "inputs": [],
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
    "name": "getLatestAppId",
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
    "name": "installApp",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "contract ITownsApp"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "contract IAppAccount"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "isAppBanned",
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
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerApp",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "contract ITownsApp"
      },
      {
        "name": "client",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "appId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "removeApp",
    "inputs": [
      {
        "name": "appId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renewApp",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "contract ITownsApp"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "contract IAppAccount"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "uninstallApp",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "internalType": "contract ITownsApp"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "contract IAppAccount"
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
    "type": "event",
    "name": "AppBanned",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "uid",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AppCreated",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "uid",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AppInstalled",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "appId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AppRegistered",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "uid",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AppRenewed",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "appId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AppSchemaSet",
    "inputs": [
      {
        "name": "uid",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AppUninstalled",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "appId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AppUnregistered",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "uid",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AppUpdated",
    "inputs": [
      {
        "name": "app",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "uid",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AppAlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AppDoesNotImplementInterface",
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
    "name": "BannedApp",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ClientAlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientPayment",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidAddressInput",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidAppId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidAppName",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidArrayInput",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidDuration",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidPrice",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAllowed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAppOwner",
    "inputs": []
  }
] as const
