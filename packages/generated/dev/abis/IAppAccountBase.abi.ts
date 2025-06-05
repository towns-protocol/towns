export default [
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
