# Membership Contract Architecture

## Overview

The Towns Protocol membership system manages space memberships through NFT tokens with time-based expiration. It supports flexible pricing models, role-based entitlements (including cross-chain validation), referral systems, and fee distribution. Built on the Diamond pattern (EIP-2535), the system currently supports native ETH payments with partial ERC20 infrastructure in place.

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
- `DispatcherStorage` - transactionBalance (ETH), transactionData
- `EntitlementGatedStorage` - crosschain check state
- `ReferralsStorage` - referral codes and fees
- `PrepayStorage` - prepaid supply tracking

### Key Facets

| Facet | Responsibility |
|-------|---------------|
| `MembershipFacet.sol` | External API (join, renew, setters) |
| `MembershipJoin.sol` | Join logic, payment processing |
| `MembershipBase.sol` | Pricing, fees, validation |
| `DispatcherBase.sol` | **Transaction capture** (stores msg.value) |
| `EntitlementGatedBase.sol` | Entitlement check requests |
| `SpaceEntitlementGated.sol` | Entitlement result handling |

## Core Flow: Join → Entitlement Check → Token

### Happy Path (Local Entitlement)

```
User: joinSpace(receiver) {value: 1 ETH}
  │
  ├─ Validate: supply limit, payment amount
  │
  ├─ Register Transaction
  │   └─ Capture: transactionBalance[txId] = 1 ETH
  │   └─ Store: [selector, sender, receiver, referral]
  │
  ├─ Check Entitlement (Local)
  │   └─ ✓ User has local entitlement → PASS
  │
  ├─ Charge for Join
  │   ├─ Protocol fee → Platform (0.0005 ETH)
  │   ├─ Partner fee → Partner (if any)
  │   ├─ Referral fee → Referrer (if any)
  │   └─ Remainder → Space owner
  │
  ├─ Refund Excess (if msg.value > required)
  │
  └─ Issue Token
      └─ Mint NFT with expiration timestamp
```

### Crosschain Entitlement Path

```
User: joinSpace(receiver) {value: 1 ETH}
  │
  ├─ Validate & Register (same as above)
  │
  ├─ Check Entitlement
  │   ├─ Local entitlements: NONE
  │   └─ Crosschain entitlements: EXISTS
  │
  ├─ Request Crosschain Check
  │   └─ Send amountDue to EntitlementChecker (for gas)
  │   └─ Payment remains locked in transactionBalance[txId]
  │
  └─ Return (pending state)

[Later - Entitlement result posted by checker]

EntitlementChecker: postEntitlementCheckResultV2(txId, PASSED)
  │
  ├─ _onEntitlementCheckResultPosted(txId, PASSED)
  │   │
  │   ├─ Retrieve: payment = transactionBalance[txId]
  │   ├─ Validate: payment >= amountDue
  │   │
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

**Purpose**: Generate unique transaction ID and capture payment

```solidity
// Called in _joinSpace() or _joinSpaceWithReferral()
bytes32 txId = _registerTransaction(receiver, encodedData);

// Inside DispatcherBase:
1. Generate keyHash = keccak256(sender, block.number)
2. Generate txId = keccak256(keyHash, inputSeed(nonce++))
3. Store: transactionData[txId] = encodedData
4. Capture: transactionBalance[txId] = msg.value  ← ETH captured here
```

**Key Point**: `transactionBalance` mapping stores **native ETH only** via `msg.value`

### Payment Release

```solidity
// Release consumed amount (after fee distribution)
_releaseCapturedValue(txId, amountDue)
  └─ transactionBalance[txId] -= amountDue

// Refund remaining balance
_refundBalance(txId, receiver)
  └─ CurrencyTransfer.transferCurrency(
      _getMembershipCurrency(),
      address(this), receiver,
      transactionBalance[txId]
  )
```

## Entitlement Check System

### Local vs Crosschain

**Local Entitlements**: No payment needed during check
- ERC20/ERC721 ownership checks
- Token balance thresholds
- Immediate validation (same transaction)

**Crosschain Entitlements**: Requires async validation
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
          ├─ First request: send amountDue (for gas)
          ├─ Subsequent: send 0
          └─ return (false, true)  ← pending state
```

### Result Posting

```solidity
// EntitlementChecker calls back (via SpaceEntitlementGated):
_onEntitlementCheckResultPosted(txId, result)
  │
  ├─ Retrieve captured payment and data
  ├─ If PASSED: process payment, issue token
  └─ If FAILED: refund full payment
```

## Current State: ETH vs ERC20

### ✅ What Works for ERC20

| Component | Status | Location |
|-----------|--------|----------|
| Fee Distribution | ✅ Ready | `CurrencyTransfer.transferCurrency()` |
| Protocol Fee | ✅ Ready | `MembershipBase._collectProtocolFee()` |
| Referral Fee | ✅ Ready | `MembershipJoin._collectReferralCodeFee()` |
| Partner Fee | ✅ Ready | `MembershipJoin._collectPartnerFee()` |
| Owner Transfer | ✅ Ready | `MembershipBase._transferIn()` |
| Refunds | ✅ Ready | `MembershipJoin._refundBalance()` |

**All transfers use `CurrencyTransfer` library which handles both ETH and ERC20**

### ❌ What's Broken for ERC20

| Issue | Location | Problem |
|-------|----------|---------|
| Payment validation | `MembershipJoin.sol:104, 143, 507` | `msg.value` checks assume ETH |
| Excess refund | `MembershipJoin.sol:516-524` | `msg.value - price` only works for ETH |
| Payment capture | `DispatcherBase._captureValue()` | Only captures `msg.value` (ETH) |
| Revenue reporting | `MembershipFacet.sol:194` | Returns `address(this).balance` |
| Currency init | `MembershipBase.sol:27` | Hardcoded to `NATIVE_TOKEN` |
| Crosschain gas | `EntitlementGatedBase.sol:238` | Sends ETH to checker (won't work for ERC20 payment) |

### Critical Insight: Crosschain + ERC20

**The Problem**: Crosschain entitlement checks require ETH for gas fees, but this is separate from membership payment.

**Current (ETH payment)**:
```
User sends: 1 ETH
  ├─ Membership payment: 0.8 ETH (held in transactionBalance)
  └─ Gas for crosschain: 0.2 ETH (sent to EntitlementChecker)
```

**ERC20 payment needs**:
```
User sends: 1000 USDC (ERC20 transfer)
           + 0.2 ETH (for crosschain gas, if needed)

Capture: 1000 USDC in contract (not in transactionBalance)
         0.2 ETH sent to EntitlementChecker
```

## ERC20 Implementation Plan

### Overview

**Complexity**: Medium (2-3 day effort)
**Files to modify**: ~6 files
**New tests needed**: ~10 test cases

### Phase 1: Payment Validation Logic

**File**: `MembershipJoin.sol`

**Changes**:
1. Replace direct `msg.value` checks with currency-aware validation
2. Handle ERC20 transfers at join time (before entitlement check)
3. Update excess refund logic for renewals

**Approach**:
```solidity
// New helper function
function _validateAndCapturePayment(uint256 required) internal {
    address currency = _getMembershipCurrency();

    if (currency == CurrencyTransfer.NATIVE_TOKEN) {
        // ETH: validate msg.value
        if (msg.value < required) revert Membership__InsufficientPayment();
    } else {
        // ERC20: transfer tokens to contract
        if (msg.value != 0) revert Membership__UnexpectedValue();
        CurrencyTransfer.safeTransferERC20(currency, msg.sender, address(this), required);
    }
}
```

**Lines to modify**:
- L104, L143: Replace `msg.value` check with `_validateAndCapturePayment()`
- L507, L516: Update renewal payment logic
- L109, L148: Skip `_reducePrepay()` call for ERC20 (or adapt prepay for ERC20)

**Estimated effort**: 4-6 hours

### Phase 2: Dispatcher Modifications

**File**: `DispatcherBase.sol`

**Problem**: `transactionBalance` only tracks ETH via `msg.value`

**Solution**: Track ERC20 balances separately

```solidity
// Add to DispatcherStorage:
struct Layout {
    mapping(bytes32 => uint256) transactionBalance;      // ETH balance
    mapping(bytes32 => uint256) transactionTokenAmount;  // ERC20 balance
    mapping(bytes32 => bytes) transactionData;
}

// Modify _captureValue:
function _captureValue(bytes32 txId) internal {
    address currency = _getMembershipCurrency();
    if (currency == NATIVE_TOKEN) {
        $.transactionBalance[txId] += msg.value;
    }
    // ERC20 already transferred to contract in Phase 1
}

// Add new function:
function _captureTokenAmount(bytes32 txId, uint256 amount) internal {
    $.transactionTokenAmount[txId] = amount;
}

// Modify _getCapturedValue:
function _getCapturedValue(bytes32 txId) internal view returns (uint256) {
    address currency = _getMembershipCurrency();
    return currency == NATIVE_TOKEN
        ? $.transactionBalance[txId]
        : $.transactionTokenAmount[txId];
}
```

**Estimated effort**: 6-8 hours (includes storage migration testing)

### Phase 3: Currency Configuration

**File**: `MembershipBase.sol`

**Changes**:
1. Make currency configurable during initialization
2. Add setter with access control
3. Validate ERC20 contract address

```solidity
// Modify __MembershipBase_init:
function __MembershipBase_init(
    Membership memory info,
    address spaceFactory,
    address currency  // NEW parameter
) internal {
    if (currency == address(0)) currency = CurrencyTransfer.NATIVE_TOKEN;
    $.membershipCurrency = currency;
    // ... rest of init
}

// Add setter:
function _setMembershipCurrency(address currency) internal {
    if (currency != NATIVE_TOKEN) {
        // Validate it's an ERC20 contract
        if (currency.code.length == 0) revert Membership__InvalidCurrency();
    }
    $.membershipCurrency = currency;
    emit MembershipCurrencyUpdated(currency);
}
```

**File**: `MembershipFacet.sol`

```solidity
// Fix revenue reporting:
function revenue() external view returns (uint256) {
    address currency = _getMembershipCurrency();
    return currency == CurrencyTransfer.NATIVE_TOKEN
        ? address(this).balance
        : IERC20(currency).balanceOf(address(this));
}
```

**Estimated effort**: 2-3 hours

### Phase 4: Crosschain Gas Handling

**File**: `EntitlementGatedBase.sol`

**Current behavior**: Sends `amountDue` as ETH to EntitlementChecker

**ERC20 behavior**: Membership payment is ERC20, but gas must still be ETH

**Solution**: Separate payment from gas

```solidity
function _requestEntitlementCheckV2(
    address walletAddress,
    address senderAddress,
    bytes32 transactionId,
    IRuleEntitlement entitlement,
    uint256 requestId,
    uint256 value  // This is for GAS, not payment
) internal {
    // For ERC20: payment already transferred in Phase 1
    // value parameter is ONLY for crosschain gas

    address currency = _getMembershipCurrency();
    if (currency != CurrencyTransfer.NATIVE_TOKEN) {
        // ERC20: msg.value is for gas only
        if (value > msg.value) revert EntitlementGated_InvalidValue();
    }

    // ... rest of logic unchanged
}
```

**Key insight**: For ERC20 memberships, user must send:
- ERC20 tokens (via approval + transferFrom)
- ETH (via msg.value) if crosschain check needed

**Estimated effort**: 2-3 hours

### Phase 5: Testing Strategy

**Test Cases Needed**:

1. **Basic ERC20 Join** (no entitlement check)
   - Approve + join with ERC20
   - Verify token transferred
   - Verify NFT minted

2. **ERC20 with Local Entitlement**
   - Join with ERC20 payment
   - Pass local entitlement
   - Verify fee distribution

3. **ERC20 with Crosschain Entitlement**
   - Join with ERC20 + ETH for gas
   - Verify payment held during check
   - Verify token minted after PASS

4. **ERC20 Rejection**
   - Join with ERC20
   - Fail entitlement check
   - Verify full ERC20 refund

5. **ERC20 Renewal**
   - Renew membership with ERC20
   - Verify no excess refund needed

6. **Fee-on-Transfer Tokens**
   - Join with deflationary ERC20
   - Verify balance tracking works

7. **Mixed Currency**
   - Switch space from ETH → ERC20
   - Verify existing members unaffected

8. **Insufficient Approval**
   - Join without approval
   - Verify revert

9. **Revenue Reporting**
   - Check revenue() for ERC20 space
   - Verify accurate balance

10. **Edge Cases**
    - Zero-value ERC20 (free space)
    - Very large token amounts
    - Tokens with 6 decimals (USDC)

**Estimated effort**: 8-10 hours

### Total Implementation Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Payment Validation | 4-6 hours | Low |
| Phase 2: Dispatcher | 6-8 hours | Medium (storage changes) |
| Phase 3: Configuration | 2-3 hours | Low |
| Phase 4: Crosschain Gas | 2-3 hours | Low |
| Phase 5: Testing | 8-10 hours | Low |
| **Total** | **22-30 hours** | **Medium** |

**Calendar time**: 2-3 days with proper testing

## Migration & Deployment

### Backward Compatibility

**Existing spaces (ETH)**: Unaffected
- `membershipCurrency` remains `NATIVE_TOKEN`
- All existing logic continues to work

**New spaces**: Can choose ETH or ERC20
- Add `currency` parameter to space creation
- Factory validates and initializes accordingly

### Deployment Strategy

1. **Deploy new facets** with ERC20 support
2. **Diamond cut** to upgrade existing spaces (optional)
3. **Test on testnet** with both ETH and USDC
4. **Gradual rollout**: Enable ERC20 for new spaces first
5. **Monitor**: Track any issues with existing ETH spaces

### Security Considerations

| Risk | Mitigation |
|------|-----------|
| ERC20 approval frontrunning | Use permit() or exact approval amounts |
| Fee-on-transfer tokens | Balance before/after tracking (already implemented) |
| Reentrancy on ERC20 transfer | ReentrancyGuard already in place |
| Storage collision | Use unique storage slots (diamond pattern) |
| Currency switching | Prevent changing currency after initialization |

## Appendix: Key Functions

### Join Flow Entry Points

```solidity
// MembershipFacet.sol
function joinSpace(address receiver) external payable nonReentrant
function joinSpaceWithReferral(address receiver, ReferralTypes memory referral)
    external payable nonReentrant
```

### Payment Capture

```solidity
// DispatcherBase.sol
function _registerTransaction(address sender, bytes memory data)
    internal returns (bytes32 transactionId)
function _captureValue(bytes32 transactionId) internal
function _getCapturedValue(bytes32 transactionId) internal view returns (uint256)
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
