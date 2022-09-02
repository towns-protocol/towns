# Solidity API

## ISpaceManager

### createSpace

```solidity
function createSpace(struct DataTypes.CreateSpaceData vars) external returns (uint256)
```

Create a new space.

| Name | Type | Description |
| ---- | ---- | ----------- |
| vars | struct DataTypes.CreateSpaceData | The data to create the space. |

### setNetworkIdToSpaceId

```solidity
function setNetworkIdToSpaceId(uint256 spaceId, string networkId) external
```

Connects the node network id to a space id

| Name | Type | Description |
| ---- | ---- | ----------- |
| spaceId | uint256 | The space id to connect to the network id |
| networkId | string | The network id to connect to the space id |

### isEntitled

```solidity
function isEntitled(uint256 spaceId, uint256 roomId, address user, enum DataTypes.EntitlementType entitlementType) external view returns (bool)
```

Checks if a user has access to space or room based on the entitlements it holds

| Name | Type | Description |
| ---- | ---- | ----------- |
| spaceId | uint256 | The id of the space |
| roomId | uint256 | The id of the room |
| user | address | The address of the user |
| entitlementType | enum DataTypes.EntitlementType | The type of entitlement to check |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool representing if the user has access or not |

### getSpaceInfoBySpaceId

```solidity
function getSpaceInfoBySpaceId(uint256 _spaceId) external view returns (struct DataTypes.SpaceInfo)
```

Get the space information by id.

| Name | Type | Description |
| ---- | ---- | ----------- |
| _spaceId | uint256 | The id of the space |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DataTypes.SpaceInfo | SpaceInfo a struct representing the space info |

### addEntitlementModule

```solidity
function addEntitlementModule(struct DataTypes.AddEntitlementData vars) external
```

Adds an entitlement module to a space.

| Name | Type | Description |
| ---- | ---- | ----------- |
| vars | struct DataTypes.AddEntitlementData | a struct representing the data to add the entitlement module. |

### getSpaces

```solidity
function getSpaces() external view returns (struct DataTypes.SpaceInfo[])
```

Returns an array of multiple space information objects

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DataTypes.SpaceInfo[] | SpaceInfo[] an array containing the space info |

### getEntitlementsBySpaceId

```solidity
function getEntitlementsBySpaceId(uint256 spaceId) external view returns (address[] entitlements)
```

Returns entitlements for a space

| Name | Type | Description |
| ---- | ---- | ----------- |
| spaceId | uint256 | The id of the space |

| Name | Type | Description |
| ---- | ---- | ----------- |
| entitlements | address[] | an array of entitlements |

### getSpaceIdByNetworkId

```solidity
function getSpaceIdByNetworkId(string networkSpaceId) external view returns (uint256)
```

Returns the space id by network id

| Name | Type | Description |
| ---- | ---- | ----------- |
| networkSpaceId | string | The network space id |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 Returns the space id |

### getSpaceOwnerBySpaceId

```solidity
function getSpaceOwnerBySpaceId(uint256 _spaceId) external view returns (address ownerAddress)
```

Returns the owner of the space by space id

| Name | Type | Description |
| ---- | ---- | ----------- |
| _spaceId | uint256 | The space id |

| Name | Type | Description |
| ---- | ---- | ----------- |
| ownerAddress | address | The address of the owner of the space |

