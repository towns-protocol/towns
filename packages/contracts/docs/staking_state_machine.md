# Staking Position State Machine

This document describes the lifecycle of a staking position in the RewardsDistributionV2 contract.

## State-Determining Fields

A deposit's state is determined by two key properties (once it exists):

- **deposit.delegatee**: Address the stake is delegated to (operator or space)
- **deposit.pendingWithdrawal**: Amount waiting to be withdrawn

Note: DepositIds are assigned sequentially starting from 0 when stake() is called. The "Non-existent" state refers to the period before calling stake() to create the deposit.

## States

### 1. Non-existent
- **Condition**: Before calling stake()/permitAndStake()/stakeOnBehalf()
- **Description**: No deposit has been created yet; depositId will be assigned upon staking

### 2. Active
- **Condition**: `delegatee != address(0)` AND `pendingWithdrawal == 0`
- **Description**: Stake is actively delegated to an operator or space, earning rewards
- **Key behaviors**:
  - Earning staking rewards based on `deposit.beneficiary`
  - Delegated voting power goes to `deposit.delegatee`
  - Can increase stake, redelegate, or change beneficiary

### 3. Withdrawal Initiated
- **Condition**: `delegatee == address(0)` AND `pendingWithdrawal > 0`
- **Description**: User has initiated withdrawal, stake is no longer active
- **Key behaviors**:
  - No longer earning rewards
  - Delegation has been removed
  - Funds held in proxy, waiting for final withdrawal
  - Can redelegate to restake the pending amount

### 4. Withdrawn
- **Condition**: `delegatee == address(0)` AND `pendingWithdrawal == 0` AND deposit exists
- **Description**: Withdrawal completed, deposit shell remains but inactive
- **Key behaviors**:
  - No active stake or pending withdrawals
  - Deposit record persists in storage
  - Cannot increase stake (would fail delegatee validation)
  - Could theoretically redelegate with 0 amount

## State Transitions

### From Non-existent → Active

**Functions**: `stake()`, `permitAndStake()`, `stakeOnBehalf()`

Creates a new deposit with:
- New depositId assigned (sequential, starting from 0)
- Delegatee set to specified operator/space
- Beneficiary set for rewards
- Stake amount transferred to new delegation proxy

---

### Active → Active (State Preserved)

#### Increase Stake

**Functions**: `increaseStake()`, `permitAndIncreaseStake()`

Adds more funds to existing position:
- Validates existing delegatee is still valid
- Increases stake amount
- Updates earning power for rewards

#### Redelegate

**Function**: `redelegate()` (when `pendingWithdrawal == 0`)

Changes delegation target:
- Validates new delegatee is operator or space
- Updates rewards with old commission rate
- Sets new delegatee and commission rate
- Calls `DelegationProxy.redelegate()` to update on-chain delegation

#### Change Beneficiary

**Function**: `changeBeneficiary()`

Changes who receives rewards:
- Validates delegatee is still valid
- Settles existing rewards
- Transfers earning power to new beneficiary

---

### Active → Withdrawal Initiated

**Function**: `initiateWithdraw()`

Begins withdrawal process:
- Calls internal withdraw logic that:
  - Sets `delegatee = address(0)`
  - Moves stake amount to `pendingWithdrawal`
  - Claims any pending rewards
- For external deposits: Calls `DelegationProxy.redelegate(address(0))`
- For self-owned deposits: Sets `pendingWithdrawal = 0` (immediate withdrawal)

**Special Case**: If `owner == address(this)`, the deposit goes directly to Withdrawn state.

---

### Withdrawal Initiated → Withdrawn

**Function**: `withdraw()`

Completes withdrawal:
- Validates `pendingWithdrawal > 0`
- Validates `owner != address(this)` (self-owned deposits cannot withdraw)
- Sets `pendingWithdrawal = 0`
- Transfers tokens from proxy to owner

---

### Withdrawal Initiated → Active

**Function**: `redelegate()` (when `pendingWithdrawal > 0`)

Restakes pending withdrawal:
- Validates new delegatee is operator or space
- Calls `increaseStake()` with `pendingWithdrawal` amount
- Sets `deposit.delegatee = newDelegatee`
- Sets `deposit.pendingWithdrawal = 0`
- Calls `DelegationProxy.redelegate()` to update delegation

This is a special recovery mechanism allowing users to restake without completing withdrawal.

---

## State Transition Diagram

```
┌─────────────┐
│             │
│ Non-existent│
│             │
└──────┬──────┘
       │ stake(), permitAndStake(), stakeOnBehalf()
       ▼
┌─────────────────────────────────────────┐
│                                         │
│              Active                     │
│  • Earning rewards                      │
│  • Delegated to operator/space          │
│                                         │◄────┐
└──┬──────────┬───────────────────────┬──┘     │
   │          │                       │        │
   │          │                       │        │
   │          │ increaseStake()       │        │
   │          │ permitAndIncreaseStake()       │
   │          │ redelegate()          │        │
   │          │ changeBeneficiary()   │        │
   │          └───────────────────────┘        │
   │                                           │
   │ initiateWithdraw()                        │
   ▼                                           │
┌─────────────────────────────────────────┐   │
│                                         │   │
│       Withdrawal Initiated              │   │
│  • No rewards                           │   │
│  • Funds in proxy, pending withdrawal   │   │
│                                         │   │
└──┬──────────────────────────────────┬───┘   │
   │                                  │       │
   │ withdraw()                       │       │
   │                                  │       │
   ▼                                  │       │
┌─────────────────────────────────────────┐  │
│                                         │  │
│            Withdrawn                    │  │
│  • Empty deposit                        │  │
│  • No active stake                      │  │
│                                         │  │
└─────────────────────────────────────────┘  │
                                             │
                  redelegate() ──────────────┘
```

## Function Availability by State

| Function                 | Non-existent | Active                   | Withdrawal Initiated | Withdrawn    |
|--------------------------|--------------|--------------------------|----------------------|--------------|
| stake()                  | ✅ Creates    | ❌                        | ❌                    | ❌            |
| permitAndStake()         | ✅ Creates    | ❌                        | ❌                    | ❌            |
| stakeOnBehalf()          | ✅ Creates    | ❌                        | ❌                    | ❌            |
| increaseStake()          | ❌            | ✅                        | ❌                    | ❌            |
| permitAndIncreaseStake() | ❌            | ✅                        | ❌                    | ❌            |
| redelegate()             | ❌            | ✅ Same state             | ✅ → Active           | ⚠️ Edge case |
| changeBeneficiary()      | ❌            | ✅                        | ❌                    | ❌            |
| initiateWithdraw()       | ❌            | ✅ → Withdrawal Initiated | ❌                    | ❌            |
| withdraw()               | ❌            | ❌                        | ✅ → Withdrawn        | ❌            |

## Special Cases

### Self-Owned Deposits (owner == address(this))

When a deposit is owned by the contract itself:

- **No delegation proxy** is used
- **initiateWithdraw()**: Sets `pendingWithdrawal = 0` immediately (goes straight to Withdrawn)
- **withdraw()**: Reverts with `RewardsDistribution__CannotWithdrawFromSelf`

This is used internally by the protocol for special staking mechanisms.

### Redelegate with Pending Withdrawal

When `redelegate()` is called on a deposit in "Withdrawal Initiated" state:

- Instead of calling `staking.redelegate()`, it calls `staking.increaseStake()`
- Treats the `pendingWithdrawal` as a new stake increase
- Manually sets `deposit.delegatee` to the new delegatee
- Manually sets `deposit.pendingWithdrawal = 0`
- Effectively "cancels" the withdrawal and restakes to a new delegatee

This provides a recovery path without requiring users to complete withdrawal and create a new deposit.

## Validation Rules

### Owner Validation
- All state-changing functions require `msg.sender == deposit.owner` (via `_revertIfNotDepositOwner()`)

### Delegatee Validation
- `increaseStake()`, `redelegate()`, `changeBeneficiary()`: Require delegatee to be a valid operator or space
- Validation happens via `_revertIfNotOperatorOrSpace(delegatee)`

### Amount Validation
- `withdraw()`: Requires `pendingWithdrawal > 0`

## Implementation Notes

### Reward Settlement
- Most state transitions trigger reward settlement via the internal `StakingRewards` library
- `_sweepSpaceRewardsIfNecessary()` is called to transfer space delegation rewards to operators

### Delegation Proxy Lifecycle
- Proxy is deployed when first stake is created (for non-self-owned deposits)
- Proxy persists through the entire deposit lifecycle
- Proxy's delegation target is updated via `redelegate()` calls
- Tokens are transferred from/to proxy during stake/withdrawal operations

### Commission Rates
- Commission rate is fetched at the time of each operation
- For space delegatees, the commission rate of their active operator is used
- Rate changes don't affect existing positions until next state transition

## References

- Main contract: `RewardsDistributionV2.sol` lines 94-242
- Base implementation: `RewardsDistributionBase.sol`
- Storage library: `StakingRewards.sol`
- Proxy implementation: `DelegationProxy.sol`
