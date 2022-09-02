# Solidity API

## CouncilStaking

This is the staking contract for the council NFT

### councilNFT

```solidity
contract IERC721 councilNFT
```

### constructor

```solidity
constructor(contract IERC721 _councilNFT) public
```

### totalSupply

```solidity
uint256 totalSupply
```

### pointsPerHour

```solidity
uint256 pointsPerHour
```

### _stakerByAddress

```solidity
mapping(address => struct DataTypes.Staker) _stakerByAddress
```

### _stakerAddressByTokenId

```solidity
mapping(uint256 => address) _stakerAddressByTokenId
```

### stakeToken

```solidity
function stakeToken(uint256 _tokenId) external
```

### withdrawToken

```solidity
function withdrawToken(uint256 _tokenId) external
```

### claimPoints

```solidity
function claimPoints() external
```

Claim accrued points

### getStakerByAddress

```solidity
function getStakerByAddress(address _staker) external view returns (struct DataTypes.Staker)
```

### getStakerAddressByTokenId

```solidity
function getStakerAddressByTokenId(uint256 _tokenId) external view returns (address)
```

### getStakedTokensByAddress

```solidity
function getStakedTokensByAddress(address _user) public view returns (struct DataTypes.StakedToken[])
```

### getAvailablePoints

```solidity
function getAvailablePoints(address _staker) public view returns (uint256)
```

### _calculatePoints

```solidity
function _calculatePoints(address _staker) internal view returns (uint256 _rewards)
```

