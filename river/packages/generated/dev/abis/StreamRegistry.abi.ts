export default [
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
  }
] as const
