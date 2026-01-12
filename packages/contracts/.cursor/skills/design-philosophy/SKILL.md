---
name: design-philosophy
description: Deep design principles for Towns Protocol smart contracts. Use when creating new facets, major refactoring, reviewing architecture decisions, or designing new abstractions.
---

# Design Philosophy for Towns Protocol

## When to Use This Skill

- Creating new facets or contracts
- Major refactoring work
- Reviewing architectural decisions
- Designing new abstractions or APIs
- Evaluating trade-offs between approaches
- Identifying and fixing design smells

## Reference Examples

| Pattern             | Example Location                |
| ------------------- | ------------------------------- |
| Modern Mod + Facet  | `src/account/facets/hub/`       |
| Domain registration | `src/domains/facets/registrar/` |

---

## Foundational Philosophy: Designing for Simplicity

The primary objective in Towns Protocol development is to **minimize complexity**—anything related to the software structure that makes it hard to understand or modify. In a system as sophisticated as this (with Diamond Pattern upgrades, cross-chain validation, and role-based permissions), managing complexity is critical.

### Core Principles

- **Strategic Programming**: Invest time in design upfront rather than quick tactical fixes. The long-term structure matters more than short-term convenience. Before adding a new facet or feature, design the abstraction carefully.

- **Goal: Obviousness**: Code should be obvious. Developers should quickly understand existing code and confidently make changes. If understanding a facet requires reading multiple files and tracing dependencies, the abstraction is leaking.

- **Eliminate Dependencies**: Minimize coupling between modules. A change in one facet should rarely require changes in others. Use events and interfaces to decouple components.

- **Eliminate Obscurity**: Name entities precisely. Document non-obvious behavior. If a function's purpose isn't clear from its signature and name, the design needs improvement.

- **Avoid Change Amplification**: Small logical changes should not require modifying many files. If adding a permission type requires touching 10+ contracts, the architecture has high coupling.

- **Reduce Cognitive Load**: Developers should not need extensive context to complete tasks. A facet's interface should be self-documenting. Storage layouts should be isolated.

- **No Unknown Unknowns**: It should be obvious which code must be modified for a given change. Clear module boundaries and interfaces prevent hidden dependencies.

### Design Philosophy for Solidity Modules

In this codebase, "modules" refers to contracts, facets, libraries, and functions. Apply these principles at all levels.

## Module Design: Building Deep, Encapsulated Contracts

### 1. Strive for Deep Modules

Contracts and facets should be **deep**: they provide **powerful functionality** through a **simple interface**.

**✅ Deep Module Example (Good):**

```solidity
// Simple interface hiding complex validation, fee charging, and registration
interface IL2Registrar {
  function register(string calldata label, address owner) external;
  function isAvailable(string calldata label) external view returns (bool);
}

// Complex implementation: validates caller is smart account, charges fees,
// validates label format, interacts with registry, sets resolver records
contract L2RegistrarFacet is IL2Registrar {
  function register(
    string calldata label,
    address owner
  ) external nonReentrant {
    L2RegistrarMod.onlySmartAccount();
    L2RegistrarMod.validateLabel(label);
    L2RegistrarMod.Layout storage $ = L2RegistrarMod.getStorage();
    $.chargeFee(label);
    $.register(label, owner);
  }
}
```

**❌ Shallow Module Example (Bad):**

```solidity
// Interface complexity matches implementation complexity (shallow)
interface IUserHelper {
  function getUserAddress(uint256 userId) external view returns (address);
  function setUserAddress(uint256 userId, address addr) external;
  function deleteUserAddress(uint256 userId) external;
}

// Implementation is just simple CRUD with no abstraction
```

**Guidelines for Deep Modules:**

- **Simple Interface, Complex Implementation**: External functions should be minimal and clear. Internal complexity should be hidden in the Mod library.
- **General Purpose Design**: Design facets to be somewhat general-purpose. Separate specialized logic from general mechanisms.
- **Powerful Abstractions**: A single function like `register()` can hide validation, fee charging, registry interaction, and resolver setup.

### 2. Information Hiding and Encapsulation

Information hiding is the most crucial technique for deep facets. In the Diamond Pattern, this is especially important because facets share a proxy but should minimize shared knowledge.

**Prevent Information Leakage:**

- **❌ Leakage**: If the storage layout details of one facet must be known by another facet, that's leakage.
- **✅ Solution**: Each facet has its own isolated storage slot via the Mod library. Facets communicate through well-defined interfaces.

**Example of Information Hiding (Good):**

```solidity
// L2RegistrarMod hides HOW registration works
library L2RegistrarMod {
  using CustomRevert for bytes4;

  function register(
    Layout storage $,
    string calldata subdomain,
    address owner
  ) internal {
    // Get registry interface - caller doesn't need to know this
    IL2Registry registry = IL2Registry($.registry);

    // Compute hashes - caller doesn't need to understand namehashing
    bytes32 domainHash = registry.baseDomainHash();
    bytes32 subdomainHash = registry.encodeSubdomain(domainHash, subdomain);

    // Register in L2 registry - caller doesn't know registry API
    registry.createSubdomain(domainHash, subdomain, owner, new bytes[](0), "");

    // Set resolver records - caller doesn't manage coin types
    bytes memory addr = abi.encodePacked(owner);
    AddrResolverFacet($.registry).setAddr(subdomainHash, $.coinType, addr);
    AddrResolverFacet($.registry).setAddr(subdomainHash, 60, addr);

    emit NameRegistered(subdomain, owner);
  }
}

// Facet exposes simple interface - users call register() without knowing internals
```

**Example of Information Leakage (Bad):**

```solidity
// Exposing internal structure forces all callers to know implementation details
function registerDomain(
  bytes32 domainHash,
  bytes32 subdomainHash,
  uint256 coinType,
  bytes memory encodedAddress
) external;

// Now external code must understand namehashing, coin types, address encoding
```

### 3. Avoid Temporal Decomposition

Do not structure code solely based on the order of operations. This often creates information leakage and tight coupling.

**❌ Temporal Decomposition (Bad):**

```solidity
contract Step1ValidateCaller { ... }
contract Step2ChargeFee { ... }
contract Step3RegisterDomain { ... }
// Each step exposes intermediate state to the next
```

**✅ Knowledge-Based Organization (Good):**

```solidity
library L2RegistrarMod {
  // Contains ALL knowledge about domain registration
  function register(
    Layout storage $,
    string calldata subdomain,
    address owner
  ) internal {
    // Internally: interact with registry, set resolvers, emit events
  }

  // Contains ALL knowledge about caller validation
  function onlySmartAccount() internal view {
    if (msg.sender.code.length == 0) {
      L2Registrar__NotSmartAccount.selector.revertWith();
    }
    // Check interface support...
  }

  // Contains ALL knowledge about label validation
  function validateLabel(string calldata label) internal pure {
    if (!isValidLabel(label)) L2Registrar__InvalidLabel.selector.revertWith();
  }
}
```

### 4. Different Layers, Different Abstractions

When tracing an operation through layers, the abstraction should change at each boundary.

**Example of Proper Layering:**

```solidity
// Layer 1: External API (user-facing abstraction)
// User thinks: "I'm registering a domain name"
function register(string calldata label, address owner) external nonReentrant {
    L2RegistrarMod.onlySmartAccount();
    L2RegistrarMod.validateLabel(label);
    L2RegistrarMod.Layout storage $ = L2RegistrarMod.getStorage();
    $.chargeFee(label);
    $.register(label, owner);
}

// Layer 2: Mod Library (business logic abstraction)
// System thinks: "I'm managing domain state and registry interactions"
function register(Layout storage $, string calldata subdomain, address owner) internal {
    IL2Registry registry = IL2Registry($.registry);
    bytes32 domainHash = registry.baseDomainHash();
    // ...
}

// Layer 3: Registry Contract (storage abstraction)
// System thinks: "I'm managing ENS-compatible records"
function createSubdomain(bytes32 parent, string calldata label, address owner, ...) external;
```

Each layer has a **distinct vocabulary and level of abstraction**. External API uses business terms (register, label). Mod uses domain terms (subdomain, registry). Low-level uses ENS terms (namehash, resolver).

### 5. Pull Complexity Downward

When encountering unavoidable complexity, resolve it **within** the module rather than pushing it onto callers.

**❌ Pushing Complexity Up (Bad):**

```solidity
// Caller must understand coin types, encoding, and resolver setup
function registerDomain(
  string calldata label,
  address owner,
  uint256 coinType,
  bytes calldata encodedOwner,
  address resolverAddress
) external;
```

**✅ Pulling Complexity Down (Good):**

```solidity
// Simple interface; complexity handled in Mod library
function register(string calldata label, address owner) external {
  L2RegistrarMod.Layout storage $ = L2RegistrarMod.getStorage();
  $.register(label, owner);
  // Mod internally handles: coin type calculation, address encoding, resolver setup
}
```

## Code Clarity: Naming, Comments, and Error Handling

### 1. Naming Conventions

Names are a form of abstraction and documentation. They create a mental model.

**Precision and Image:**

- Names must be **precise, unambiguous, and intuitive**
- The name should convey what the entity **is** and **is not**
- Avoid vague names like `manager`, `handler`, `helper`, `utils`

**Examples:**

❌ **Vague Names:**

- `manager` → Use `L2RegistrarMod` (handles domain registration logic)
- `check()` → Use `onlySmartAccount()` (validates caller is smart account)
- `process()` → Use `chargeFee()` (charges registration fee)
- `data` → Use `Layout` (storage layout for the facet)

**Consistency:**

- Use consistent terminology across the codebase
- If you call it a "label" in one place, don't call it a "subdomain" in the interface
- Follow the pattern: `FeatureMod.sol`, `FeatureFacet.sol`, `IFeature.sol`

**Red Flag:** If you struggle to find a simple, precise name, the entity likely has an unclear purpose or poor design.

### 2. Strategic Use of Comments

Comments capture knowledge that cannot be represented in code. They are fundamental to abstraction.

**What to Comment:**

- **The What (Abstraction)**: What does this function/contract provide at a high level?
- **The Why (Rationale)**: Why was this design chosen? What problem does it solve?
- **The Non-Obvious**: What cannot be inferred from the code itself?

**What NOT to Comment:**

- **The How (Implementation)**: The code already shows how it works
- **Redundant Information**: Don't repeat what's in the function name

**Interface Documentation (NatSpec):**

Every public/external function must have NatSpec that defines the abstraction:

```solidity
/// @notice Registers a subdomain for a Towns smart account
/// @dev Validates caller is IModularAccount, charges fee, creates subdomain
/// @param label The subdomain label (e.g., "alice" for alice.towns.eth)
/// @param owner The address that will own the subdomain
function register(string calldata label, address owner) external;
```

**Implementation Comments:**

Use implementation comments sparingly for non-obvious logic:

```solidity
// ENSIP-11: Maps EVM chainId to ENS coinType by setting MSB (bit 31).
// This avoids collisions with SLIP-44 native coin types and enables
// deterministic L2 address resolution. Formula: coinType = 0x80000000 | chainId
$.coinType = 0x80000000 | block.chainid;

// Set forward address for mainnet ETH (coinType 60) for easier debugging
addrResolver.setAddr(subdomainHash, 60, addr);
```

### 3. Handling Errors and Special Cases

Exceptions and special conditions contribute disproportionately to complexity. They force conditional logic throughout the codebase.

**Modern Error Pattern:**

```solidity
library L2RegistrarMod {
  using CustomRevert for bytes4;

  error L2Registrar__InvalidLabel();
  error L2Registrar__NotSmartAccount();

  function validateLabel(string calldata label) internal pure {
    if (!isValidLabel(label)) L2Registrar__InvalidLabel.selector.revertWith();
  }

  function onlySmartAccount() internal view {
    if (msg.sender.code.length == 0) {
      L2Registrar__NotSmartAccount.selector.revertWith();
    }
    // ...
  }
}
```

**Define Errors Out of Existence:**

Modify semantics so exceptional conditions become normal:

**❌ Special Case (Bad):**

```solidity
function isAvailable(
  string calldata label
) external view returns (bool available, string memory reason);
// Returns flag AND reason; caller must handle multiple cases
```

**✅ Normal Case (Good):**

```solidity
function isAvailable(string calldata label) external view returns (bool) {
  // Invalid labels return false (not available)
  if (!isValidLabel(label)) return false;
  // Existing domains return false
  return registry.subdomainOwner(subdomainHash) == address(0);
}
// Simple boolean - no special cases for caller to handle
```

**Exception Masking:**

Handle exceptions low in the system to hide them from higher layers:

```solidity
// Low-level function masks interface check failure
function onlySmartAccount() internal view {
  if (msg.sender.code.length == 0) {
    L2Registrar__NotSmartAccount.selector.revertWith();
  }

  try
    IERC165(msg.sender).supportsInterface(type(IModularAccount).interfaceId)
  returns (bool supported) {
    if (!supported) L2Registrar__NotSmartAccount.selector.revertWith();
  } catch {
    // Mask the catch - same error regardless of failure mode
    L2Registrar__NotSmartAccount.selector.revertWith();
  }
}
```

## Design Process and Red Flags

### Design It Twice

For major design decisions (new facets, public APIs, core abstractions), consider **at least two radically different approaches**:

**Example: Designing Domain Registration**

**Option 1: Direct Registry Interaction**

- Facet directly calls registry methods
- Pros: Simple, fewer contracts
- Cons: Tight coupling, hard to add middleware

**Option 2: Mod Library Pattern**

- Facet delegates to Mod library
- Pros: Testable, reusable, clear separation
- Cons: One more file to maintain

**Option 3: Separate Validator Contract**

- External contract for validation logic
- Pros: Upgradeable validation rules
- Cons: More gas, external calls

Evaluate trade-offs explicitly. Document the decision rationale in comments or docs.

### Red Flags: Warning Signs of Poor Design

- **Shallow Module**: Interface complexity rivals implementation complexity. The module doesn't hide much.
  - _Example_: A facet with 20 external functions that are mostly simple getters/setters with no abstractions.

- **Information Leakage**: The same knowledge/decision is reflected in multiple modules.
  - _Example_: Multiple facets need to know about coin type encoding or namehash computation.

- **Pass-Through Method**: Function does nothing but call another function with similar signature.
  - _Example_: `function getRegistry() external { return L2RegistrarMod.getStorage().registry; }` is acceptable for simple getters, but watch for complex pass-throughs.

- **Vague Name**: Name is imprecise and doesn't convey useful information.
  - _Example_: `processLabel()`, `handleRequest()`, `manager`, `helper`

- **Special-General Mixture**: Module mixes general mechanisms with specialized code for one use case.
  - _Example_: A general registrar that has hardcoded logic for one specific domain.

- **Conjoined Methods**: Two methods are commonly called together; their signatures are related.
  - _Example_: Always calling `validateLabel()` then `register()` suggests validation should be internal to register.

- **Comment Describes Implementation**: Comment explains what code is doing rather than why.
  - _Example_: `// Loop through characters and check if valid` (obvious from code)

- **Hard to Name**: Difficulty finding a clear name for a module, function, or variable.
  - _Example_: Suggests the entity has unclear purpose or tries to do too many unrelated things.

### Refactoring Triggers

If you encounter these red flags, consider refactoring:

1. **Extract to Mod Library**: Move internal logic from Facet to Mod for better testability
2. **Merge Related Functions**: If two functions always called together, combine them
3. **Split Unrelated Concerns**: If a Mod does too many things, split it
4. **Improve Interface**: If interface is complex, find a simpler abstraction
5. **Hide Information**: If implementation details leak, add an abstraction layer in the Mod

## Summary: Principles in Practice

When designing or modifying Towns Protocol contracts:

1. **Think Strategically**: Invest in design upfront; prioritize long-term structure
2. **Design Deep Modules**: Simple interfaces in Facet, powerful implementations in Mod
3. **Hide Information**: Isolate knowledge in Mod libraries; expose minimal interface
4. **Use Precise Names**: Names should create clear mental models (`L2Registrar__InvalidLabel`)
5. **Document Abstractions**: Write comments that describe what and why, not how
6. **Eliminate Special Cases**: Design so edge cases are handled uniformly (return `false` vs throw)
7. **Design It Twice**: Consider alternatives for major decisions
8. **Watch for Red Flags**: Shallow modules, information leakage, vague names

These principles compound. Well-designed abstractions make the codebase easier to understand, modify, and extend—crucial for a complex, upgradeable system like Towns Protocol.
