# Membership Contract Architecture

## Overview

The Towns Protocol membership system manages space memberships through NFT tokens with time-based expiration. It supports flexible pricing models, role-based entitlements (including cross-chain validation), referral systems, and fee distribution. Built on the Diamond pattern (EIP-2535), the system supports both native ETH and ERC20 (e.g., USDC) payments.

## Architecture

### Contract Hierarchy

```
MembershipFacet (external interface)
  └─ MembershipJoin (join + renewal logic)
      ├─ MembershipBase (pricing, fees, storage)
      ├─ DispatcherBase (transaction capture)
      ├─ EntitlementGatedBase (entitlement checks)
      ├─ ReferralsBase (referral fees)
      ├─ PrepayBase (prepaid memberships)
      ├─ PointsBase (rewards points)
      └─ ERC721ABase (NFT implementation)

SpaceEntitlementGated (result handler)
  └─ Overrides _onEntitlementCheckResultPosted()
```

### Storage Architecture

**Diamond Storage Pattern** - Each facet uses isolated storage:

- `MembershipStorage` - pricing, duration, limits, currency
- `DispatcherStorage` - transactionBalance, transactionData
- `EntitlementGatedStorage` - crosschain check state
- `ReferralsStorage` - referral codes and fees
- `PrepayStorage` - prepaid supply tracking

### Key Facets

| Facet | Responsibility |
|-------|---------------|
| `MembershipFacet.sol` | External API (join, renew, setters) |
| `MembershipJoin.sol` | Join logic, payment processing |
| `MembershipBase.sol` | Pricing, fees, validation |
| `DispatcherBase.sol` | Transaction capture (ETH/ERC20) |
| `EntitlementGatedBase.sol` | Entitlement check requests |
| `SpaceEntitlementGated.sol` | Entitlement result handling |

## Payment Model

### Fee-Added Pricing

The system uses a **fee-added** pricing model where protocol fees are added on top of the base price:

```
Total Price = Base Price + Protocol Fee

Example (ETH):
  Base Price:    1.0 ETH  → Space owner
  Protocol Fee:  0.1 ETH  → Platform
  Total:         1.1 ETH  ← User pays this
```

### Currency Support

Memberships can be priced in:
- **Native ETH** (`address(0)` or `NATIVE_TOKEN`)
- **ERC20 tokens** (e.g., USDC) - must be enabled in FeeManager

Currency validation happens in `_setMembershipCurrency()` which requires the token to have an enabled fee configuration in FeeManager.

## Core Flow: Join → Entitlement Check → Token

### Happy Path (Local Entitlement)

```
User: joinSpace(receiver) + payment
  │
  ├─ Validate: supply limit, payment amount
  │
  ├─ Register Transaction
  │   └─ Capture payment in transactionBalance[txId]
  │   └─ Store: [selector, sender, receiver, referral]
  │
  ├─ Check Entitlement (Local)
  │   └─ ✓ User has local entitlement → PASS
  │
  ├─ Charge for Join
  │   ├─ Protocol fee → Platform
  │   ├─ Partner fee → Partner (if any)
  │   ├─ Referral fee → Referrer (if any)
  │   └─ Base price → Space owner
  │
  ├─ Refund Excess (if overpaid)
  │
  └─ Issue Token
      └─ Mint NFT with expiration timestamp
```

### Crosschain Entitlement Path

```
User: joinSpace(receiver) + payment
  │
  ├─ Validate & Register (same as above)
  │
  ├─ Check Entitlement
  │   ├─ Local entitlements: NONE
  │   └─ Crosschain entitlements: EXISTS
  │
  ├─ Request Crosschain Check
  │   └─ Send gas fee to EntitlementChecker
  │   └─ Payment remains locked in transactionBalance[txId]
  │
  └─ Return (pending state)

[Later - Entitlement result posted by checker]

EntitlementChecker: postEntitlementCheckResultV2(txId, PASSED)
  │
  ├─ _onEntitlementCheckResultPosted(txId, PASSED)
  │   ├─ Retrieve: payment = transactionBalance[txId]
  │   ├─ Charge for Join (same fee distribution)
  │   ├─ Refund Excess
  │   └─ Issue Token
  │
  └─ Delete Transaction
```

### Rejection Path

```
Entitlement Check: FAILED
  │
  ├─ _rejectMembership(txId, receiver)
  │   ├─ Delete: transactionData[txId]
  │   ├─ Refund: full transactionBalance[txId] → receiver
  │   └─ Emit: MembershipTokenRejected
  │
  └─ Transaction cleaned up
```

## Payment Capture System

### Transaction Registration

Generates unique transaction ID and captures payment amount:

```solidity
// Called in _joinSpace() or _joinSpaceWithReferral()
bytes32 txId = _registerTransaction(sender, encodedData, capturedAmount);

// Inside DispatcherBase:
// 1. Generate txId from sender + block.number + nonce
// 2. Store: transactionData[txId] = encodedData
// 3. Capture: transactionBalance[txId] = capturedAmount
```

### Payment Release

```solidity
// Release consumed amount (after fee distribution)
_releaseCapturedValue(txId, amountDue)

// Refund remaining balance
_refundBalance(txId, receiver)
  └─ CurrencyTransfer.transferCurrency(currency, address(this), receiver, remaining)
```

## Entitlement Check System

### Local vs Crosschain

**Local Entitlements**: Immediate validation (same transaction)
- ERC20/ERC721 ownership checks
- Token balance thresholds
- User allowlists

**Crosschain Entitlements**: Async validation
- Checks on other chains (Ethereum L1, Base L2)
- Requires ETH for gas (sent to EntitlementChecker)
- Payment held until result posted

### Check Flow

```
_checkEntitlement(receiver, sender, txId, amountDue)
  │
  ├─ PHASE 1: Check Local Entitlements
  │   └─ If ANY pass → return (true, false)
  │
  └─ PHASE 2: Check Crosschain Entitlements
      └─ For each crosschain entitlement:
          ├─ First request: send gas fee
          └─ return (false, true)  ← pending state
```

## Appendix: Key Functions

### Join Flow Entry Points

```solidity
// MembershipFacet.sol
function joinSpace(address receiver) external payable nonReentrant
function joinSpace(JoinType joinType, bytes calldata data) external payable nonReentrant
function joinSpaceWithReferral(address receiver, ReferralTypes memory referral)
    external payable nonReentrant
```

### Payment Capture

```solidity
// DispatcherBase.sol
function _registerTransaction(address sender, bytes memory data, uint256 capturedAmount)
    internal returns (bytes32 transactionId)
function _getCapturedValue(bytes32 transactionId) internal view returns (uint256)
function _releaseCapturedValue(bytes32 transactionId, uint256 amount) internal
```

### Fee Distribution

```solidity
// MembershipBase.sol
function _collectProtocolFee(address payer, uint256 membershipPrice)
    internal returns (uint256 protocolFee)
function _transferIn(address from, uint256 amount) internal returns (uint256)
```

### Entitlement Checking

```solidity
// MembershipJoin.sol
function _checkEntitlement(address receiver, address sender, bytes32 txId, uint256 amount)
    internal returns (bool isEntitled, bool isCrosschainPending)

// EntitlementGatedBase.sol
function _requestEntitlementCheckV2(...)
function _postEntitlementCheckResultV2(bytes32 txId, uint256 roleId, NodeVoteStatus result)
```
