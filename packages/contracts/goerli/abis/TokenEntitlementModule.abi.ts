export default [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name_",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description_",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "moduleType_",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "spaceManager_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "roleManager_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "permissionRegistry_",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InvalidParameters",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotSpaceManager",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RoleAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "_permisionRegistry",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "_roleManager",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "_spaceManager",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "spaceId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "channelId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "roleId",
        "type": "uint256"
      }
    ],
    "name": "addRoleIdToChannel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "description",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "spaceId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "roleId",
        "type": "uint256"
      }
    ],
    "name": "getEntitlementDataByRoleId",
    "outputs": [
      {
        "internalType": "bytes[]",
        "name": "",
        "type": "bytes[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "spaceId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserRoles",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "roleId",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          }
        ],
        "internalType": "struct DataTypes.Role[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "spaceId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "channelId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          }
        ],
        "internalType": "struct DataTypes.Permission",
        "name": "permission",
        "type": "tuple"
      }
    ],
    "name": "isEntitled",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "spaceId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "entitlementId",
        "type": "bytes32"
      }
    ],
    "name": "isTokenEntitled",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "moduleType",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "spaceId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "channelId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "roleId",
        "type": "uint256"
      }
    ],
    "name": "removeRoleIdFromChannel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "spaceId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "roleId",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "entitlementData",
        "type": "bytes"
      }
    ],
    "name": "removeSpaceEntitlement",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "spaceId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "roleId",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "entitlementData",
        "type": "bytes"
      }
    ],
    "name": "setSpaceEntitlement",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const
