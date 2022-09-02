# Solidity API

## Events

### Minted

```solidity
event Minted(address recipient)
```

emitted when an NFT is minted

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | the address that receives the NFT |

### Staked

```solidity
event Staked(address user, uint256 tokenId)
```

emitted when tokens are staked

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | the staker |
| tokenId | uint256 | the ids of the tokens being staked |

### Withdraw

```solidity
event Withdraw(address user, uint256 tokenId)
```

emitted when tokens are withdrawn

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | the unstaker |
| tokenId | uint256 | the ids of the tokens being removed |

### PointsClaimed

```solidity
event PointsClaimed(address user, uint256 points)
```

emitted when points are claimed

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | the wallet |
| points | uint256 | the points claimed by the user |

## Events

### CreateSpace

```solidity
event CreateSpace(address owner, string spaceName, uint256 spaceId)
```

