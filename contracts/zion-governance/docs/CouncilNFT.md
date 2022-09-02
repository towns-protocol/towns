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

