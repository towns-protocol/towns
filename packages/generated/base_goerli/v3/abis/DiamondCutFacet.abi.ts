export default [
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "name": "DiamondCut_FunctionAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "facet",
        "type": "address"
      }
    ],
    "name": "DiamondCut_FunctionDoesNotExist",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "name": "DiamondCut_FunctionFromSameFacetAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DiamondCut_ImmutableFacet",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "init",
        "type": "address"
      }
    ],
    "name": "DiamondCut_InvalidContract",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "facet",
        "type": "address"
      }
    ],
    "name": "DiamondCut_InvalidFacet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DiamondCut_InvalidFacetCutAction",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DiamondCut_InvalidFacetCutLength",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "facet",
        "type": "address"
      },
      {
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "name": "DiamondCut_InvalidFacetRemoval",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "facet",
        "type": "address"
      }
    ],
    "name": "DiamondCut_InvalidFacetSelectors",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DiamondCut_InvalidSelector",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "version",
        "type": "uint32"
      }
    ],
    "name": "Initializable_AlreadyInitialized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Initializable_InInitializingState",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Initializable_NotInInitializingState",
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
    "anonymous": false,
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "facetAddress",
            "type": "address"
          },
          {
            "internalType": "enum IDiamond.FacetCutAction",
            "name": "action",
            "type": "uint8"
          },
          {
            "internalType": "bytes4[]",
            "name": "functionSelectors",
            "type": "bytes4[]"
          }
        ],
        "indexed": false,
        "internalType": "struct IDiamond.FacetCut[]",
        "name": "facetCuts",
        "type": "tuple[]"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "init",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "initPayload",
        "type": "bytes"
      }
    ],
    "name": "DiamondCut",
    "type": "event"
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
    "inputs": [],
    "name": "__DiamondCut_init",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "facetAddress",
            "type": "address"
          },
          {
            "internalType": "enum IDiamond.FacetCutAction",
            "name": "action",
            "type": "uint8"
          },
          {
            "internalType": "bytes4[]",
            "name": "functionSelectors",
            "type": "bytes4[]"
          }
        ],
        "internalType": "struct IDiamond.FacetCut[]",
        "name": "facetCuts",
        "type": "tuple[]"
      },
      {
        "internalType": "address",
        "name": "init",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "initPayload",
        "type": "bytes"
      }
    ],
    "name": "diamondCut",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
