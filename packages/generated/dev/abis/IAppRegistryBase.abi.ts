export default [
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
    "name": "InvalidArrayInput",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAppOwner",
    "inputs": []
  }
] as const
