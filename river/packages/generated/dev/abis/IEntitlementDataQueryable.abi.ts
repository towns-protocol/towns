export default [
  {
    "type": "function",
    "name": "getChannelEntitlementDataByPermission",
    "inputs": [
      {
        "name": "channelId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "permission",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct IEntitlementDataQueryableBase.EntitlementData[]",
        "components": [
          {
            "name": "entitlementType",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "entitlementData",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEntitlementDataByPermission",
    "inputs": [
      {
        "name": "permission",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct IEntitlementDataQueryableBase.EntitlementData[]",
        "components": [
          {
            "name": "entitlementType",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "entitlementData",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "stateMutability": "view"
  }
] as const
