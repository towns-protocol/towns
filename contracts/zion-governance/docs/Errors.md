# Solidity API

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

