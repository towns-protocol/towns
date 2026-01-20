---
name: guidelines-advisor
description: Comprehensive smart contract development advisor based on Trail of Bits' best practices. Analyzes codebase to generate documentation/specifications, review architecture, check upgradeability patterns, assess implementation quality, identify pitfalls, review dependencies, and evaluate testing. Provides actionable recommendations.
---

# Guidelines Advisor

## Purpose

Systematically examine codebases to provide guidance on:

1. Generating documentation and specifications
2. Optimizing on-chain/off-chain architecture
3. Reviewing upgradeability patterns
4. Checking delegatecall/proxy implementations
5. Assessing implementation quality
6. Identifying common pitfalls
7. Reviewing dependencies
8. Evaluating test suites

**Framework**: Building Secure Contracts - Development Guidelines

---

## How This Works

### Phase 1: Discovery & Context

Explores project structure, contract files, existing documentation, architecture patterns, testing setup, and dependencies.

### Phase 2: Documentation Generation

Creates plain English system descriptions, architectural diagrams, and NatSpec completeness recommendations.

### Phase 3: Architecture Analysis

Analyzes on-chain/off-chain distribution, upgradeability approaches, and proxy patterns.

### Phase 4: Implementation Review

Assesses function composition, inheritance structure, event logging, common pitfalls, dependencies, and testing coverage.

### Phase 5: Recommendations

Presents prioritized improvement suggestions, best practices, and actionable next steps.

---

## Assessment Areas

Analyzes 11 comprehensive areas:

1. **Documentation & Specifications**: Plain English descriptions, architectural diagrams, NatSpec completeness
2. **On-Chain vs Off-Chain Computation**: Complexity analysis, gas optimization, verification patterns
3. **Upgradeability**: Migration vs upgradeability trade-offs, data separation, upgrade procedures
4. **Delegatecall Proxy Pattern**: Storage layout consistency, initialization patterns, function shadowing risks
5. **Function Composition**: Function size, logical grouping, modularity assessment
6. **Inheritance**: Hierarchy depth/width, diamond problem risks, visualization
7. **Events**: Critical operation coverage, naming consistency, indexed parameters
8. **Common Pitfalls**: Reentrancy, integer overflow/underflow, access control issues
9. **Dependencies**: Library quality, version management, copied code detection
10. **Testing & Verification**: Coverage analysis, fuzzing, formal verification, CI/CD integration
11. **Platform-Specific Guidance**: Solidity version recommendations, compiler warnings, inline assembly

---

## Deliverables

### 1. System Documentation

- Plain English descriptions
- Architectural diagrams
- Documentation gaps analysis

### 2. Architecture Analysis

- On-chain/off-chain assessment
- Upgradeability review
- Proxy pattern security review

### 3. Implementation Review

- Function composition analysis
- Inheritance assessment
- Events coverage
- Pitfall identification
- Dependencies evaluation
- Testing analysis

### 4. Prioritized Recommendations

- CRITICAL (address immediately)
- HIGH (address before deployment)
- MEDIUM (address for production quality)
- LOW (nice to have)

---

## Assessment Process

1. **Explore the codebase**: Identify files, documentation, tests, proxies, dependencies
2. **Generate documentation**: Create descriptions, diagrams, identify gaps
3. **Analyze architecture**: Assess distribution, upgradeability, proxy patterns
4. **Review implementation**: Analyze functions, inheritance, events, pitfalls, dependencies, testing
5. **Provide recommendations**: Present findings with file references, ask design questions, suggest improvements, outline next steps

---

## Rationalizations (Do Not Skip)

| Rationalization                                       | Why It's Wrong                                                  | Required Action                                             |
| ----------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| "System is simple, description covers everything"     | Plain English descriptions miss security-critical details       | Complete all 5 phases                                       |
| "No upgrades detected, skip upgradeability section"   | Upgradeability can be implicit (ownable patterns, delegatecall) | Search for proxy patterns before declaring N/A              |
| "Not applicable" without verification                 | Premature scope reduction misses vulnerabilities                | Verify with explicit codebase search                        |
| "Architecture is straightforward, no analysis needed" | Obvious architectures have subtle trust boundaries              | Analyze on-chain/off-chain distribution, access control     |
| "Common pitfalls don't apply to this codebase"        | Every codebase has common pitfalls                              | Systematically check all guideline pitfalls                 |
| "Tests exist, testing guideline is satisfied"         | Test existence != test quality                                  | Check coverage, property-based tests, integration tests     |
| "I can provide generic best practices"                | Generic advice isn't actionable                                 | Provide project-specific findings with file:line references |
| "User knows what to improve from findings"            | Findings without prioritization = no action plan                | Generate prioritized improvement roadmap                    |

---

## Notes

- Only analyzes relevant sections; won't hallucinate about absent features
- Adapts to platform (Solidity, Rust, Cairo, etc.)
- Uses available tools but works without them
- Provides file references and line numbers for all findings
- Asks questions about design decisions inferred from code

---

## Ready to Begin

**What I'll need**:

- Access to your codebase
- Context about project goals
- Existing documentation or specifications
- Information about deployment plans
