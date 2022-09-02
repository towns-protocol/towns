# Solidity API

## TokenEntitlementModule

### zionSpaceManager

```solidity
address zionSpaceManager
```

### ExternalToken

```solidity
struct ExternalToken {
  address contractAddress;
  uint256 quantity;
}
```

### TokenEntitlement

```solidity
struct TokenEntitlement {
  struct TokenEntitlementModule.ExternalToken[] tokens;
  struct DataTypes.Entitlement[] entitlements;
}
```

### RoomTokenEntitlements

```solidity
struct RoomTokenEntitlements {
  mapping(string => struct TokenEntitlementModule.TokenEntitlement) entitlementsByDescription;
}
```

### SpaceTokenEntitlements

```solidity
struct SpaceTokenEntitlements {
  mapping(string => struct TokenEntitlementModule.TokenEntitlement) entitlementsByDescription;
  mapping(uint256 => struct TokenEntitlementModule.RoomTokenEntitlements) roomEntitlementsByRoomId;
  mapping(enum DataTypes.EntitlementType => string[]) tagsByEntitlementType;
}
```

### entitlementsBySpaceId

```solidity
mapping(uint256 => struct TokenEntitlementModule.SpaceTokenEntitlements) entitlementsBySpaceId
```

### constructor

```solidity
constructor(address _zionSpaceManager) public
```

### name

```solidity
function name() public pure returns (string)
```

### setUserEntitlement

```solidity
function setUserEntitlement(struct DataTypes.TokenEntitlementData vars) public
```

### removeUserEntitlement

```solidity
function removeUserEntitlement(uint256 spaceId, uint256 roomId, string description, enum DataTypes.EntitlementType[] entitlementTypes) public
```

### isEntitled

```solidity
function isEntitled(uint256 spaceId, uint256, address user, enum DataTypes.EntitlementType entitlementType) public view returns (bool)
```

### isTokenEntitled

```solidity
function isTokenEntitled(uint256 spaceId, address user, string tag) public view returns (bool)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

_See {IERC165-supportsInterface}._

