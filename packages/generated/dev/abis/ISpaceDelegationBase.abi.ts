export default [
  {
    "type": "event",
    "name": "RiverTokenChanged",
    "inputs": [
      {
        "name": "riverToken",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SpaceDelegatedToOperator",
    "inputs": [
      {
        "name": "space",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "operator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SpaceFactoryChanged",
    "inputs": [
      {
        "name": "spaceFactory",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "SpaceDelegation__AlreadyDelegated",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SpaceDelegation__InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__InvalidOperator",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__InvalidSpace",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__InvalidStakeRequirement",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__NotDelegated",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__NotSpaceMember",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpaceDelegation__NotSpaceOwner",
    "inputs": []
  }
] as const
