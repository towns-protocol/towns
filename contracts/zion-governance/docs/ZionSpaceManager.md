# Solidity API

## ZionSpaceManager

### totalSpaces

```solidity
uint256 totalSpaces
```

### spaceIsRegistered

```solidity
mapping(string => bool) spaceIsRegistered
```

### spaceById

```solidity
mapping(uint256 => struct DataTypes.Space) spaceById
```

### spaceIdByNetworkId

```solidity
mapping(string => uint256) spaceIdByNetworkId
```

### createSpace

```solidity
function createSpace(struct DataTypes.CreateSpaceData vars) external returns (uint256)
```

Create a new space.

### setNetworkIdToSpaceId

```solidity
function setNetworkIdToSpaceId(uint256 spaceId, string networkId) external
```

Connects the node network id to a space id

### addEntitlementModule

```solidity
function addEntitlementModule(struct DataTypes.AddEntitlementData vars) external
```

Adds an entitlement module to a space.

### isEntitled

```solidity
function isEntitled(uint256 spaceId, uint256 roomId, address user, enum DataTypes.EntitlementType entitlementType) public view returns (bool)
```

### getSpaceInfoBySpaceId

```solidity
function getSpaceInfoBySpaceId(uint256 _spaceId) external view returns (struct DataTypes.SpaceInfo)
```

### getSpaces

```solidity
function getSpaces() external view returns (struct DataTypes.SpaceInfo[])
```

### getEntitlementsBySpaceId

```solidity
function getEntitlementsBySpaceId(uint256 spaceId) public view returns (address[] entitlements)
```

### getSpaceIdByNetworkId

```solidity
function getSpaceIdByNetworkId(string networkSpaceId) external view returns (uint256)
```

### getSpaceOwnerBySpaceId

```solidity
function getSpaceOwnerBySpaceId(uint256 _spaceId) external view returns (address ownerAddress)
```

### _isAllowedAsciiString

```solidity
function _isAllowedAsciiString(bytes str) internal pure returns (bool)
```

Checks if a string contains valid username ASCII characters [0-1], [a-z] and _.

| Name | Type | Description |
| ---- | ---- | ----------- |
| str | bytes | the string to be checked. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true if the string contains only valid characters, false otherwise. |

### _validateName

```solidity
function _validateName(string name) private pure
```

