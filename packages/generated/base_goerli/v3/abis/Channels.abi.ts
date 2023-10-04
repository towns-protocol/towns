export default [
  {
    "inputs": [],
    "name": "ChannelService__ChannelAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ChannelService__ChannelDisabled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ChannelService__ChannelDoesNotExist",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ChannelService__RoleAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ChannelService__RoleDoesNotExist",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Entitlement__InvalidValue",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Entitlement__NotAllowed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Entitlement__ValueAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Initializable_InInitializingState",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Introspection_AlreadySupported",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Introspection_NotSupported",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Ownable__NotOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Ownable__ZeroAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Pausable__NotPaused",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Pausable__Paused",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Validator__InvalidStringLength",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "version",
        "type": "uint32"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "InterfaceAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "InterfaceRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Paused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Unpaused",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "channelId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "roleId",
        "type": "uint256"
      }
    ],
    "name": "addRoleToChannel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "channelId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      },
      {
        "internalType": "uint256[]",
        "name": "roleIds",
        "type": "uint256[]"
      }
    ],
    "name": "createChannel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "channelId",
        "type": "string"
      }
    ],
    "name": "getChannel",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "id",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "disabled",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "metadata",
            "type": "string"
          },
          {
            "internalType": "uint256[]",
            "name": "roleIds",
            "type": "uint256[]"
          }
        ],
        "internalType": "struct IChannelBase.Channel",
        "name": "channel",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getChannels",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "id",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "disabled",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "metadata",
            "type": "string"
          },
          {
            "internalType": "uint256[]",
            "name": "roleIds",
            "type": "uint256[]"
          }
        ],
        "internalType": "struct IChannelBase.Channel[]",
        "name": "channels",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "channelId",
        "type": "string"
      }
    ],
    "name": "removeChannel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "channelId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "roleId",
        "type": "uint256"
      }
    ],
    "name": "removeRoleFromChannel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "channelId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "disabled",
        "type": "bool"
      }
    ],
    "name": "updateChannel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
