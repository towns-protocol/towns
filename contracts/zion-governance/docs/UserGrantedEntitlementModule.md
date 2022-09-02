# Solidity API

## UserGrantedEntitlementModule

### zionSpaceManagerAddress

```solidity
address zionSpaceManagerAddress
```

### RoomUserEntitlements

```solidity
struct RoomUserEntitlements {
  mapping(address => struct DataTypes.Entitlement[]) entitlementsByAddress;
}
```

### SpaceUserEntitlements

```solidity
struct SpaceUserEntitlements {
  mapping(address => struct DataTypes.Entitlement[]) entitlementsByAddress;
  mapping(uint256 => struct UserGrantedEntitlementModule.RoomUserEntitlements) roomEntitlementsByRoomId;
}
```

### entitlementsBySpaceId

```solidity
mapping(uint256 => struct UserGrantedEntitlementModule.SpaceUserEntitlements) entitlementsBySpaceId
```

### constructor

```solidity
constructor(address _zionSpaceManagerAddress) public
```

### setUserEntitlement

```solidity
function setUserEntitlement(struct DataTypes.EntitlementData vars) public
```

### isEntitled

```solidity
function isEntitled(uint256 spaceId, uint256 roomId, address user, enum DataTypes.EntitlementType entitlementType) public view returns (bool)
```

### removeUserEntitlement

```solidity
function removeUserEntitlement(address originAddress, uint256 spaceId, uint256 roomId, address user, enum DataTypes.EntitlementType[] _entitlementTypes) public
```

### getUserEntitlements

```solidity
function getUserEntitlements(uint256 spaceId, uint256 roomId, address user) public view returns (struct DataTypes.Entitlement[])
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

_See {IERC165-supportsInterface}._

