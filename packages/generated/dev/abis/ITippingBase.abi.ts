export default [
  {
    "type": "event",
    "name": "Tip",
    "inputs": [
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "currency",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "receiver",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "messageId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "channelId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AmountIsZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CannotTipSelf",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CurrencyIsZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReceiverIsNotMember",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TokenDoesNotExist",
    "inputs": []
  }
] as const
