# Solidity API

## CouncilNFT

This is the main NFT contract for the council of Zion

### baseURI

```solidity
string baseURI
```

the base uri for the nft metadata including image uri

### currentTokenId

```solidity
uint256 currentTokenId
```

the counter token id for the next mint

### alreadyMinted

```solidity
mapping(address => bool) alreadyMinted
```

mapping to track which  users have already minted an nft

### allowlistMint

```solidity
bool allowlistMint
```

### waitlistMint

```solidity
bool waitlistMint
```

### publicMint

```solidity
bool publicMint
```

### root

```solidity
bytes32 root
```

the root of the merkle tree for the allowlist

### constructor

```solidity
constructor(string _name, string _symbol, string _baseURI, bytes32 _root) public
```

### privateMint

```solidity
function privateMint(address recipient, uint256 allowance, bytes32[] proof) public payable returns (uint256)
```

the primary minting method for the allowlist and waitlist minting periods

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | the address that will receive the minted NFT |
| allowance | uint256 | of 1 means user is on the allowlist, @allowance of 0 means user is on the waitlist |
| proof | bytes32[] | the generated merkle proof that this user is on the allowlist or waitlist |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | tokenId token id of the minted NFT |

### mint

```solidity
function mint(address recipient) public payable returns (uint256)
```

the secondary minting method used only when public minting is active

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | the address that will receive the minted NFT |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | tokenId token id of the minted NFT |

### mintTo

```solidity
function mintTo(address recipient) private returns (uint256)
```

Verify that the user sent the proper amount of ether to mint
Verify that there are still more NFTs to mint
Mint the NFT to the user

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view virtual returns (string)
```

Get the tokenURI for the given tokenId

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the id of the token to get the tokenURI for |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | the tokenURI for the given tokenId |

### withdrawPayments

```solidity
function withdrawPayments(address payable payee) external
```

withdraw the balance from the contract

| Name | Type | Description |
| ---- | ---- | ----------- |
| payee | address payable | the address that will receive the withdrawn ether |

### startWaitlistMint

```solidity
function startWaitlistMint() public
```

starts the waitlist minting period

### startPublicMint

```solidity
function startPublicMint() public
```

starts the public minting period

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

## Constants

### TOTAL_SUPPLY

```solidity
uint256 TOTAL_SUPPLY
```

the total supply of the collection

### MINT_PRICE

```solidity
uint256 MINT_PRICE
```

the mint price for an individual nft

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

## Errors

### MintPriceNotPaid

```solidity
error MintPriceNotPaid()
```

thrown when an incorrect amount of ETH is sent to mint

### MaxSupply

```solidity
error MaxSupply()
```

thrown when the max supply is reached

### NonExistentTokenURI

```solidity
error NonExistentTokenURI()
```

thrown when a token is not minted

### WithdrawTransfer

```solidity
error WithdrawTransfer()
```

thrown when the withdraw payment transaction fails

### AlreadyMinted

```solidity
error AlreadyMinted()
```

thrown when user tries to mint more than 1 token with same wallet

### NoTokensProvided

```solidity
error NoTokensProvided()
```

thrown when no tokens are provided

### NotTokenOwner

```solidity
error NotTokenOwner()
```

thrown when a token is not owned by the user

### NoStakedTokens

```solidity
error NoStakedTokens()
```

thrown when no tokens are staked by user

### NoPointsToClaim

```solidity
error NoPointsToClaim()
```

thrown when no there are not points to claim by user

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

## BackgroundPicker

### currentVal

```solidity
uint256 currentVal
```

### ValChanged

```solidity
event ValChanged(uint256 newVal)
```

### store

```solidity
function store(uint256 newVal) public
```

### getVal

```solidity
function getVal() public view returns (uint256)
```

## ClaimPool

### zionTokenBalance

```solidity
uint256 zionTokenBalance
```

### zionTokenAddress

```solidity
address zionTokenAddress
```

### zionToken

```solidity
contract IERC20 zionToken
```

### claimedAddresses

```solidity
mapping(address => bool) claimedAddresses
```

### ONE_TIME_CLAIM_AMOUNT

```solidity
uint256 ONE_TIME_CLAIM_AMOUNT
```

### UNRESTRICTED_CLAIM_AMOUNT

```solidity
uint256 UNRESTRICTED_CLAIM_AMOUNT
```

### constructor

```solidity
constructor(address _zionTokenAddress) public
```

### getZionTokenBalance

```solidity
function getZionTokenBalance() public view returns (uint256)
```

### isEligible

```solidity
function isEligible(address _address) public view returns (bool)
```

### hasClaimed

```solidity
function hasClaimed(address _address) public view returns (bool)
```

### claimTokens

```solidity
function claimTokens() public
```

### claimUnrestrictedTokens

```solidity
function claimUnrestrictedTokens() public
```

## ClaimPoolGSN

### zionTokenBalance

```solidity
uint256 zionTokenBalance
```

### zionTokenAddress

```solidity
address zionTokenAddress
```

### zionToken

```solidity
contract IERC20 zionToken
```

### claimedAddresses

```solidity
mapping(address => bool) claimedAddresses
```

### ONE_TIME_CLAIM_AMOUNT

```solidity
uint256 ONE_TIME_CLAIM_AMOUNT
```

### UNRESTRICTED_CLAIM_AMOUNT

```solidity
uint256 UNRESTRICTED_CLAIM_AMOUNT
```

### constructor

```solidity
constructor(address _zionTokenAddress, address forwarder) public
```

### versionRecipient

```solidity
string versionRecipient
```

### getZionTokenBalance

```solidity
function getZionTokenBalance() public view returns (uint256)
```

### isEligible

```solidity
function isEligible(address _address) public view returns (bool)
```

### hasClaimed

```solidity
function hasClaimed(address _address) public view returns (bool)
```

### claimTokens

```solidity
function claimTokens() public
```

### claimUnrestrictedTokens

```solidity
function claimUnrestrictedTokens() public
```

## Greeter

### greeting

```solidity
string greeting
```

### count

```solidity
uint256 count
```

### constructor

```solidity
constructor(string _greeting) public
```

### greet

```solidity
function greet() public view returns (string)
```

### setCount

```solidity
function setCount(uint256 _count) public
```

### getCount

```solidity
function getCount() public view returns (uint256)
```

### setGreeting

```solidity
function setGreeting(string _greeting) public
```

## Zion

### vTotalSupply

```solidity
uint256 vTotalSupply
```

### constructor

```solidity
constructor() public
```

### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address from, address to, uint256 amount) internal
```

_Move voting power when tokens are transferred.

Emits a {DelegateVotesChanged} event._

### _mint

```solidity
function _mint(address to, uint256 amount) internal
```

### _burn

```solidity
function _burn(address account, uint256 amount) internal
```

_Snapshots the totalSupply after it has been decreased._

## TimeLock

### constructor

```solidity
constructor(uint256 minDelay, address[] proposers, address[] executors) public
```

## ZionGovernor

### constructor

```solidity
constructor(contract IVotes _token, contract TimelockController _timelock, uint256 _quorumPercentage, uint256 _votingPeriod, uint256 _votingDelay) public
```

### votingDelay

```solidity
function votingDelay() public view returns (uint256)
```

### votingPeriod

```solidity
function votingPeriod() public view returns (uint256)
```

### quorum

```solidity
function quorum(uint256 blockNumber) public view returns (uint256)
```

### state

```solidity
function state(uint256 proposalId) public view returns (enum IGovernor.ProposalState)
```

### propose

```solidity
function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) public returns (uint256)
```

### proposalThreshold

```solidity
function proposalThreshold() public view returns (uint256)
```

### _execute

```solidity
function _execute(uint256 proposalId, address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) internal
```

### _cancel

```solidity
function _cancel(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) internal returns (uint256)
```

### _executor

```solidity
function _executor() internal view returns (address)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

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

## ISpaceEntitlementModule

### isEntitled

```solidity
function isEntitled(uint256 spaceId, uint256 roomId, address userAddress, enum DataTypes.EntitlementType entitlementType) external view returns (bool)
```

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

## Constants

### MIN_NAME_LENGTH

```solidity
uint8 MIN_NAME_LENGTH
```

### MAX_NAME_LENGTH

```solidity
uint8 MAX_NAME_LENGTH
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

## Errors

### NameLengthInvalid

```solidity
error NameLengthInvalid()
```

### NameContainsInvalidCharacters

```solidity
error NameContainsInvalidCharacters()
```

### SpaceAlreadyRegistered

```solidity
error SpaceAlreadyRegistered()
```

### NotSpaceOwner

```solidity
error NotSpaceOwner()
```

### EntitlementAlreadyRegistered

```solidity
error EntitlementAlreadyRegistered()
```

### EntitlementModuleNotSupported

```solidity
error EntitlementModuleNotSupported()
```

## Events

### CreateSpace

```solidity
event CreateSpace(address owner, string spaceName, uint256 spaceId)
```

## SpaceStorage

