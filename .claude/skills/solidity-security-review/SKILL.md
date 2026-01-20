---
name: solidity-security-review
description: Smart contract security review methodology. Use when auditing Solidity code, analyzing vulnerabilities, or verifying security findings.
---

# Smart Contract Security Review

## Review Methodology

Run these skills in order, then verify findings before reporting:

**Step 1: entry-point-analyzer**
Map all public/external entry points and their parameters.

**Step 2: audit-context-building**
Deep code analysis. Apply **5 Whys** to every conditional branch involving user-controlled parameters.

**Step 3: guidelines-advisor**
Best practices and common pitfalls check.

**Step 4: Verification**
For each raw finding, verify by tracing exact execution path. Filter findings with confidence < 8/10. Never report without verification—false positives waste developer time.

## Output Format

After completing all steps, output ONLY a findings table.

**Include ONLY** findings that could lead to: loss of funds, unauthorized access, reward manipulation, or denial of service.

**Exclude**: documentation gaps, gas optimizations, code style, theoretical issues with unsupported token types.

```
| ID | Finding | Severity | File:Line | Evidence |
|----|---------|----------|-----------|----------|
| 1  | [Description] | CRITICAL/HIGH/MEDIUM/LOW | `File.sol:XX` | [Proof or attack path] |
```

---

## Input Validation & 5 Whys

Every user-provided input must be validated. Apply **5 Whys** to understand why each branch exists and whether an attacker can exploit it:

```
Observation: Token transfer is skipped when owner == address(this)

Why #1: Why is the transfer skipped?
→ The code assumes tokens are already in the contract

Why #2: Why would tokens already be there?
→ Internal flow deposits tokens before calling

Why #3: Why is there no check that internal flow actually called?
→ The code trusts only internal flows use owner == address(this)

Why #4: Why would only internal flows use that value?
→ No reason - external callers can pass any owner value

Why #5: Why is this dangerous?
→ Attacker creates unbacked stake, drains rewards
```

**Special values to test for each user-controlled parameter:**

- `address(0)` - zero address
- `address(this)` - the contract itself
- `msg.sender` - caller address
- `type(uintX).max` - maximum values

**Validation questions:**

- Is there any legitimate reason to allow this input value?
- Does the code path assume trusted caller but accept untrusted input?
- Are all branches of conditional logic safe for all possible inputs?

**Example vulnerability:**

```solidity
// VULNERABLE - allows arbitrary owner without validation:
function stakeOnBehalf(..., address owner, ...) external {
    // Missing: if (owner == address(this)) revert InvalidOwner();
    depositId = _stake(amount, delegatee, beneficiary, owner, false);
}

// In _stake():
if (owner != address(this)) {
    ds.staking.stakeToken.safeTransferFrom(msg.sender, proxy, amount);
} else {
    // NO TRANSFER - assumes internal use only
    // But stakeOnBehalf allows external callers to reach this path!
}
```

## Token Flow Analysis

Always trace: (1) where tokens come FROM, (2) where tokens go TO, (3) who gets ownership/benefits

```solidity
// Tokens: FROM msg.sender, TO proxy
ds.staking.stakeToken.safeTransferFrom(msg.sender, proxy, amount);

// Questions to answer:
// - Who pays the tokens? (msg.sender vs arbitrary parameter)
// - Who receives the tokens/deposit?
// - Who gets the benefits (rewards, ownership)?
// - What happens if transfer is skipped?
```

## EVM Call Frames and Revert Behavior

Both regular function calls and low-level calls create new call frames. The difference is how reverts are handled:

```solidity
// Regular function call - revert propagates automatically:
function foo() external {
    bar();  // If bar() reverts, foo() reverts too, all state rolled back
}

// Low-level call - revert is captured, caller decides:
function foo() external {
    storage.value = 1;  // This persists even if inner call reverts!

    (bool success, ) = address(this).call(
        abi.encodeCall(IContract.method, (arg))
    );

    if (!success) {
        // Inner call reverted - but we continue execution
        // State changes INSIDE the .call() are rolled back
        // State changes BEFORE the .call() persist!
    }
}
```

**Key points**:

- Low-level `address.call()`: captures revert, returns `(false, errorData)`, caller decides to bubble up or continue
- `try-catch`: syntactic sugar that also captures reverts, state before `try` persists on catch
- State changes BEFORE `.call()` or `try` persist even if inner call reverts

## Common False Positives

| Claim                         | Reality Check                               |
| ----------------------------- | ------------------------------------------- |
| "State persists after revert" | Only if low-level call captures the revert  |
| "Overflow possible"           | Check if token supply constrains values     |
| "No validation on read"       | Check if write-side is protected            |
| "Silent failure is bug"       | May be intentional for batch protection     |
| "Anyone can call"             | Check if caller pays tokens (gift vs theft) |

## Intentional Design Patterns

Recognize when "vulnerabilities" are intentional:

- **Silent failures in batch operations**: Prevent one bad item from bricking entire batch
- **Self-healing mechanisms**: Failed operations retry on next call
- **Cross-chain resilience**: L1→L2 messages are expensive to retry

## Finding Severity Guidelines

| Severity | Criteria                                               |
| -------- | ------------------------------------------------------ |
| CRITICAL | Direct fund loss, unauthorized access to funds         |
| HIGH     | Significant economic impact, DoS on critical functions |
| MEDIUM   | Limited impact, requires specific conditions           |
| LOW      | Best practice violations, design concerns              |
