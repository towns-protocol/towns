SpacesSchema

```
{
  "spaceId": {
    "spaceId": uint256,
    "createdAt": uint256,
    "networkSpaceId": uint256,
    "name": string,
    "creatorAddress": address,
    "ownerAddress": address,
    "rooms": [
      {
        "roomId": uint256,
        "createdAt": uint256,
        "name": string,
        "creatorAddress": address
      }
    ],
    "entitlementModuleAddresses": {
      "tag": address
    },
    "entitlementModuleTags": [
      string
    ]
  }
}
```

UserGrantedEntitlement Schema

```
  {
    "entitlementsBySpaceId": {
      "spaceId": {
        "entitlementsByAddress": {
          "0x1": [
            {
              "entitlementType": "EntitlementType",
              "grantedBy": "addrress",
              "grantedTime: "uint256"
            }
          ]
        },
        "roomEntitlementsByRoomId": {
          "roomId": {
            "0x1": [
              {
                "entitlementType": "EntitlementType",
                "grantedBy": "addrress",
                "grantedTime: "uint256"
              }
            ]
          }
        }
      }
    }
  }
```
