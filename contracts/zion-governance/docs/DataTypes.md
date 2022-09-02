# Solidity API

## DataTypes

### ContractState

```solidity
enum ContractState {
  Unpaused,
  Paused
}
```

### StakedToken

```solidity
struct StakedToken {
  address staker;
  uint256 tokenId;
}
```

### Staker

```solidity
struct Staker {
  uint256 amountStaked;
  struct DataTypes.StakedToken[] stakedTokens;
  uint256 timeOfLastUpdate;
  uint256 unclaimedPoints;
}
```

## DataTypes

A standard library of data types used throughout the Zion Space Manager.

### Room

```solidity
struct Room {
  uint256 roomId;
  uint256 createdAt;
  string name;
  address creatorAddress;
}
```

### Space

```solidity
struct Space {
  uint256 spaceId;
  uint256 createdAt;
  string networkSpaceId;
  string name;
  address creator;
  address owner;
  struct DataTypes.Space[] rooms;
  mapping(string => address) entitlements;
  string[] entitlementTags;
}
```

### SpaceInfo

```solidity
struct SpaceInfo {
  uint256 spaceId;
  uint256 createdAt;
  string name;
  address creator;
  address owner;
}
```

### EntitlementType

```solidity
enum EntitlementType {
  Owner,
  Administrator,
  Moderator,
  Join,
  Leave,
  Read,
  Write,
  Block,
  Redact,
  Add_Channel,
  Remove_Channel
}
```

### Entitlement

```solidity
struct Entitlement {
  address grantedBy;
  uint256 grantedTime;
  enum DataTypes.EntitlementType entitlementType;
}
```

### CreateSpaceData

```solidity
struct CreateSpaceData {
  string spaceName;
  address[] entitlements;
}
```

### AddEntitlementData

```solidity
struct AddEntitlementData {
  uint256 spaceId;
  address entitlement;
  string entitlementTag;
}
```

### EntitlementData

```solidity
struct EntitlementData {
  uint256 spaceId;
  uint256 roomId;
  address user;
  enum DataTypes.EntitlementType[] entitlementTypes;
}
```

### TokenEntitlementData

```solidity
struct TokenEntitlementData {
  uint256 spaceId;
  uint256 roomId;
  string description;
  address[] tokens;
  uint256[] quantities;
  enum DataTypes.EntitlementType[] entitlementTypes;
}
```

