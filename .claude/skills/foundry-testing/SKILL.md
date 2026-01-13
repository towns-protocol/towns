---
name: foundry-testing
description: ALWAYS load before writing or modifying Foundry test files (.t.sol). Covers fuzz testing, gas benchmarks, naming conventions, and test patterns.
---

# Foundry Testing Best Practices

## Fuzz Testing Strategy

1. **Fuzz function inputs by default** - When a test function has parameters, Foundry automatically fuzzes them
2. **Use `bound()` over `vm.assume`** - Prefer `bound(value, min, max)` to constrain inputs; `vm.assume` discards runs and wastes iterations
3. **Apply Equivalence Class Partitioning** - Only fuzz parameters that affect the code path under test. If a parameter doesn't change behavior, use a fixed representative value
4. **Maximize bounds** - Use the widest reasonable bounds to maximize coverage

```solidity
// Good: bound with max range
amount = bound(amount, 1, type(uint96).max);

// Avoid: vm.assume wastes fuzz runs
vm.assume(amount > 0 && amount < type(uint96).max);
```

## Test Organization

1. **Gas benchmarks use `_gas` suffix** - Enables filtering with `forge test --mt gas`
2. **Pattern**: `test_foo_gas()` calls `test_foo(fixed, values)` for deterministic gas measurement
3. **Tests can return values** for composition and reuse
4. **Group tests by functionality** with section headers

```solidity
function test_stake_gas() public returns (uint256 depositId) {
    depositId = test_stake(address(this), 1 ether, OPERATOR, 0, address(this));
}

function test_stake(
    address depositor,
    uint96 amount,
    address operator,
    uint256 commissionRate,
    address beneficiary
) public givenOperator(operator, commissionRate) returns (uint256 depositId) {
    // Implementation...
}
```

## Modularity

1. **Extract setup as modifiers** - e.g., `givenOperator(operator, rate)`, `givenSpaceHasPointedToOperator(space, operator)`
2. **Decouple unit tests** - Avoid complex dependencies; simpler tests are easier to fuzz
3. **Use harness contracts** for testing internal functions

```solidity
contract MyContractHarness is MyContractBase {
    function internalFunction(uint256 x) external pure returns (uint256) {
        return _internalFunction(x);
    }
}
```

## Coverage Requirements

1. **Verify events** with `vm.expectEmit`
2. **Verify reverts** with `vm.expectRevert`
3. **Test storage slots** - Verify EIP-7201 namespaced storage constants
4. **Cover critical paths** - All state transitions, edge cases, and error conditions

```solidity
// Event verification
vm.expectEmit(address(contract));
emit SomeEvent(expectedArg1, expectedArg2);
contract.someFunction();

// Revert verification
vm.expectRevert(SomeError.selector);
contract.shouldRevert();

// Storage slot verification (EIP-7201)
function test_storageSlot() public pure {
    bytes32 slot = keccak256(
        abi.encode(uint256(keccak256("namespace.storage")) - 1)
    ) & ~bytes32(uint256(0xff));
    assertEq(slot, MyStorage.STORAGE_SLOT);
}
```

## Naming Convention

| Pattern                                | Usage                                   |
| -------------------------------------- | --------------------------------------- |
| `test_functionName(params)`            | Fuzz test (default when has parameters) |
| `test_functionName_gas()`              | Gas benchmark with fixed inputs         |
| `test_functionName_revertIf_Condition` | Revert condition tests                  |
| `test_functionName_EdgeCase`           | Specific edge case tests                |

## Gas Benchmarking Workflow

To compare gas usage before/after code changes:

```bash
# 1. Stash source changes (keep test changes)
git stash push -m "optimization" -- src/path/to/Changed.sol

# 2. Run baseline snapshot (--mt gas filters to _gas suffix tests)
forge snapshot --mc TestContract --mt gas

# 3. Pop stash to restore changes
git stash pop

# 4. Run diff against baseline
forge snapshot --mc TestContract --mt gas --diff
```

This workflow:

- Keeps new `_gas` test functions while measuring the old implementation
- Shows gas delta for each test with percentage change
- Reports overall gas change summary

## Reference Examples

- [RewardsDistributionV2.t.sol](test/base/registry/RewardsDistributionV2.t.sol) - Comprehensive test patterns
- [SubscriptionModuleUnit.t.sol](test/apps/modules/SubscriptionModuleUnit.t.sol) - Harness pattern for internal functions
