export default [
  {
    "type": "function",
    "name": "addPermissionsToRole",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "permissions",
        "type": "string[]",
        "internalType": "string[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "addRoleToEntitlement",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "entitlement",
        "type": "tuple",
        "internalType": "struct IRolesBase.CreateEntitlement",
        "components": [
          {
            "name": "module",
            "type": "address",
            "internalType": "contract IEntitlement"
          },
          {
            "name": "data",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "clearChannelPermissionOverrides",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "channelId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createRole",
    "inputs": [
      {
        "name": "roleName",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "permissions",
        "type": "string[]",
        "internalType": "string[]"
      },
      {
        "name": "entitlements",
        "type": "tuple[]",
        "internalType": "struct IRolesBase.CreateEntitlement[]",
        "components": [
          {
            "name": "module",
            "type": "address",
            "internalType": "contract IEntitlement"
          },
          {
            "name": "data",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getChannelPermissionOverrides",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "channelId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "permissions",
        "type": "string[]",
        "internalType": "string[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPermissionsByRoleId",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "permissions",
        "type": "string[]",
        "internalType": "string[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleById",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IRolesBase.Role",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "disabled",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "permissions",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "entitlements",
            "type": "address[]",
            "internalType": "contract IEntitlement[]"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoles",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct IRolesBase.Role[]",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "name",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "disabled",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "permissions",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "entitlements",
            "type": "address[]",
            "internalType": "contract IEntitlement[]"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "removePermissionsFromRole",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "permissions",
        "type": "string[]",
        "internalType": "string[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeRole",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeRoleFromEntitlement",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "entitlement",
        "type": "tuple",
        "internalType": "struct IRolesBase.CreateEntitlement",
        "components": [
          {
            "name": "module",
            "type": "address",
            "internalType": "contract IEntitlement"
          },
          {
            "name": "data",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setChannelPermissionOverrides",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "channelId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "permissions",
        "type": "string[]",
        "internalType": "string[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateRole",
    "inputs": [
      {
        "name": "roleId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "roleName",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "permissions",
        "type": "string[]",
        "internalType": "string[]"
      },
      {
        "name": "entitlements",
        "type": "tuple[]",
        "internalType": "struct IRolesBase.CreateEntitlement[]",
        "components": [
          {
            "name": "module",
            "type": "address",
            "internalType": "contract IEntitlement"
          },
          {
            "name": "data",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
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
    "name": "PermissionsAddedToChannelRole",
    "inputs": [
      {
        "name": "updater",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "channelId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PermissionsRemovedFromChannelRole",
    "inputs": [
      {
        "name": "updater",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "channelId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PermissionsUpdatedForChannelRole",
    "inputs": [
      {
        "name": "updater",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "channelId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleCreated",
    "inputs": [
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleRemoved",
    "inputs": [
      {
        "name": "remover",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleUpdated",
    "inputs": [
      {
        "name": "updater",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "roleId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "Entitlement__InvalidValue",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Entitlement__NotAllowed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Entitlement__NotMember",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Entitlement__ValueAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementsService__EntitlementDoesNotExist",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementsService__InvalidEntitlementAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EntitlementsService__InvalidEntitlementInterface",
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
  },
  {
    "type": "error",
    "name": "OwnerQueryForNonexistentToken",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__EntitlementAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__EntitlementDoesNotExist",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__InvalidEntitlementAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__InvalidPermission",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__PermissionAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__PermissionDoesNotExist",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__RoleDoesNotExist",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Roles__RoleIsImmutable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeCastOverflowedUintDowncast",
    "inputs": [
      {
        "name": "bits",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  }
] as const
