# Solidity API

## ISpaceManager

### createSpace

```solidity
function createSpace(struct DataTypes.CreateSpaceData vars) external returns (uint256)
```

### isEntitled

```solidity
function isEntitled(uint256 spaceId, uint256 roomId, address user, enum DataTypes.EntitlementType entitlementType) external view returns (bool)
```

### getSpaceInfoBySpaceId

```solidity
function getSpaceInfoBySpaceId(uint256 _spaceId) external view returns (struct DataTypes.SpaceInfo)
```

### addEntitlementModule

```solidity
function addEntitlementModule(struct DataTypes.AddEntitlementData vars) external
```

### getEntitlementsBySpaceId

```solidity
function getEntitlementsBySpaceId(uint256 spaceId) external view returns (address[] entitlements)
```

### getSpaceOwnerBySpaceId

```solidity
function getSpaceOwnerBySpaceId(uint256 _spaceId) external view returns (address ownerAddress)
```

