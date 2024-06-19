export default [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "approvedOperators",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "__OperatorRegistry_init",
    "inputs": [
      {
        "name": "initialOperators",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "__RiverConfig_init",
    "inputs": [
      {
        "name": "configManagers",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allocateStream",
    "inputs": [
      {
        "name": "streamId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "nodes",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "genesisMiniblockHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "genesisMiniblock",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approveConfigurationManager",
    "inputs": [
      {
        "name": "manager",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approveOperator",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "configurationExists",
    "inputs": [
      {
        "name": "key",
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
    "name": "deleteConfiguration",
    "inputs": [
      {
        "name": "key",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deleteConfigurationOnBlock",
    "inputs": [
      {
        "name": "key",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "blockNumber",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAllConfiguration",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct Setting[]",
        "components": [
          {
            "name": "key",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "blockNumber",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "value",
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
    "name": "getAllNodeAddresses",
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
    "name": "getAllNodes",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct Node[]",
        "components": [
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum NodeStatus"
          },
          {
            "name": "url",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "nodeAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "operator",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAllStreamIds",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAllStreams",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct StreamWithId[]",
        "components": [
          {
            "name": "id",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "stream",
            "type": "tuple",
            "internalType": "struct Stream",
            "components": [
              {
                "name": "lastMiniblockHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "lastMiniblockNum",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "reserved0",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "flags",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "nodes",
                "type": "address[]",
                "internalType": "address[]"
              }
            ]
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getConfiguration",
    "inputs": [
      {
        "name": "key",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct Setting[]",
        "components": [
          {
            "name": "key",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "blockNumber",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "value",
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
    "name": "getNode",
    "inputs": [
      {
        "name": "nodeAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Node",
        "components": [
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum NodeStatus"
          },
          {
            "name": "url",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "nodeAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "operator",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getNodeCount",
    "inputs": [],
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
    "name": "getPaginatedStreams",
    "inputs": [
      {
        "name": "start",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "stop",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct StreamWithId[]",
        "components": [
          {
            "name": "id",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "stream",
            "type": "tuple",
            "internalType": "struct Stream",
            "components": [
              {
                "name": "lastMiniblockHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "lastMiniblockNum",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "reserved0",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "flags",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "nodes",
                "type": "address[]",
                "internalType": "address[]"
              }
            ]
          }
        ]
      },
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
    "name": "getStream",
    "inputs": [
      {
        "name": "streamId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Stream",
        "components": [
          {
            "name": "lastMiniblockHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "lastMiniblockNum",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "reserved0",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "flags",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "nodes",
            "type": "address[]",
            "internalType": "address[]"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStreamByIndex",
    "inputs": [
      {
        "name": "i",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct StreamWithId",
        "components": [
          {
            "name": "id",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "stream",
            "type": "tuple",
            "internalType": "struct Stream",
            "components": [
              {
                "name": "lastMiniblockHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "lastMiniblockNum",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "reserved0",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "flags",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "nodes",
                "type": "address[]",
                "internalType": "address[]"
              }
            ]
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStreamCount",
    "inputs": [],
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
    "name": "getStreamWithGenesis",
    "inputs": [
      {
        "name": "streamId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Stream",
        "components": [
          {
            "name": "lastMiniblockHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "lastMiniblockNum",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "reserved0",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "flags",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "nodes",
            "type": "address[]",
            "internalType": "address[]"
          }
        ]
      },
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStreamsOnNode",
    "inputs": [
      {
        "name": "nodeAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct StreamWithId[]",
        "components": [
          {
            "name": "id",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "stream",
            "type": "tuple",
            "internalType": "struct Stream",
            "components": [
              {
                "name": "lastMiniblockHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "lastMiniblockNum",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "reserved0",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "flags",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "nodes",
                "type": "address[]",
                "internalType": "address[]"
              }
            ]
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isConfigurationManager",
    "inputs": [
      {
        "name": "manager",
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
    "name": "isOperator",
    "inputs": [
      {
        "name": "operator",
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
    "name": "placeStreamOnNode",
    "inputs": [
      {
        "name": "streamId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "nodeAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registerNode",
    "inputs": [
      {
        "name": "nodeAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "url",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum NodeStatus"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeConfigurationManager",
    "inputs": [
      {
        "name": "manager",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeNode",
    "inputs": [
      {
        "name": "nodeAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeOperator",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeStreamFromNode",
    "inputs": [
      {
        "name": "streamId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "nodeAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setConfiguration",
    "inputs": [
      {
        "name": "key",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "blockNumber",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "value",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setStreamLastMiniblock",
    "inputs": [
      {
        "name": "streamId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "lastMiniblockHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "lastMiniblockNum",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "isSealed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setStreamLastMiniblockBatch",
    "inputs": [
      {
        "name": "miniblocks",
        "type": "tuple[]",
        "internalType": "struct SetMiniblock[]",
        "components": [
          {
            "name": "streamId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "prevMiniBlockHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "lastMiniblockHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "lastMiniblockNum",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "isSealed",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateNodeStatus",
    "inputs": [
      {
        "name": "nodeAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum NodeStatus"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateNodeUrl",
    "inputs": [
      {
        "name": "nodeAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "url",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ConfigurationChanged",
    "inputs": [
      {
        "name": "key",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "block",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "value",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      },
      {
        "name": "deleted",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ConfigurationManagerAdded",
    "inputs": [
      {
        "name": "manager",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ConfigurationManagerRemoved",
    "inputs": [
      {
        "name": "manager",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Initialized",
    "inputs": [
      {
        "name": "version",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "InterfaceAdded",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "indexed": true,
        "internalType": "bytes4"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "InterfaceRemoved",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "indexed": true,
        "internalType": "bytes4"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "NodeAdded",
    "inputs": [
      {
        "name": "nodeAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "url",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "status",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum NodeStatus"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "NodeRemoved",
    "inputs": [
      {
        "name": "nodeAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "NodeStatusUpdated",
    "inputs": [
      {
        "name": "nodeAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "status",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum NodeStatus"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "NodeUrlUpdated",
    "inputs": [
      {
        "name": "nodeAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "url",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OperatorAdded",
    "inputs": [
      {
        "name": "operatorAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OperatorRemoved",
    "inputs": [
      {
        "name": "operatorAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StreamAllocated",
    "inputs": [
      {
        "name": "streamId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "nodes",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      },
      {
        "name": "genesisMiniblockHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "genesisMiniblock",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StreamLastMiniblockUpdateFailed",
    "inputs": [
      {
        "name": "streamId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "lastMiniblockHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "lastMiniblockNum",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "reason",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StreamLastMiniblockUpdated",
    "inputs": [
      {
        "name": "streamId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "lastMiniblockHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "lastMiniblockNum",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "isSealed",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StreamPlacementUpdated",
    "inputs": [
      {
        "name": "streamId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "nodeAddress",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "isAdded",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "Initializable_InInitializingState",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Initializable_NotInInitializingState",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Introspection_AlreadySupported",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Introspection_NotSupported",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Ownable__NotOwner",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "Ownable__ZeroAddress",
    "inputs": []
  }
] as const
