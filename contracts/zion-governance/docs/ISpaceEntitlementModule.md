# Solidity API

## ISpaceEntitlementModule

### isEntitled

```solidity
function isEntitled(uint256 spaceId, uint256 roomId, address userAddress, enum DataTypes.EntitlementType entitlementType) external view returns (bool)
```

Checks if a user has access to space or room based on the entitlements it holds

| Name | Type | Description |
| ---- | ---- | ----------- |
| spaceId | uint256 | The id of the space |
| roomId | uint256 | The id of the room |
| userAddress | address | The address of the user |
| entitlementType | enum DataTypes.EntitlementType | The type of entitlement to check |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool representing if the user has access or not |

