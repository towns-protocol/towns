# Swap Integration Guide

This guide provides comprehensive documentation for integrating with the Towns Protocol swap system, which consists of SwapRouter (central routing) and SwapFacet (space-specific implementation).

## Overview

The Towns Protocol swap system provides two integration options for executing token swaps:

- **SwapRouter**: Permissionless central routing contract that anyone can use directly. Handles swap execution, protocol fee collection, and integration with whitelisted DEX aggregators
- **SwapFacet**: Optional intermediary layer that adds space-specific benefits: membership validation, configurable poster fees, and points rewards

### Key Features

- **Permissionless Access**: SwapRouter can be used by anyone without restrictions
- **Optional Space Benefits**: SwapFacet adds value-added features for space members
- **Dual Swap Methods**: Standard swaps and Permit2-based swaps (both contracts)
- **Transfer Efficiency**: Permit2 reduces token transfer hops (important for fee-on-transfer tokens)
- **Flexible Fee Structure**: Protocol fees + optional space poster fees
- **ETH Integration**: Special handling for ETH swaps with pre-calculated fees
- **Security**: Whitelisted routers, slippage protection, and anti-manipulation measures

## Architecture Options

### Direct SwapRouter Usage (Permissionless)
```
User → SwapRouter → Whitelisted DEX Aggregator
         ↓
   Protocol Fee Collection
```

### SwapFacet Usage (Space Members)
```
User → SwapFacet → SwapRouter → Whitelisted DEX Aggregator
         ↓            ↓
    Membership    Protocol Fee
    Validation    Collection
    Poster Fees
    Points Rewards
```

### Token Transfer Hops

**executeSwap Method:**
- Direct SwapRouter: 1 hop (User → SwapRouter)
- Via SwapFacet: 2 hops (User → SwapFacet → SwapRouter)

**executeSwapWithPermit Method:**
- Both contracts: 1 hop (User → SwapRouter via Permit2)

## Prerequisites

### 1. Contract Addresses

```typescript
// Base addresses (update for your network)
const SPACE_FACTORY_ADDRESS = "0x9978c826d93883701522d2CA645d5436e5654252"; // SpaceFactory diamond
const SWAP_ROUTER_ADDRESS = "0x95A2a333D30c8686dE8D01AC464d6034b9aA7b24"; // SwapRouter diamond
const SPACE_ADDRESS = "0x..."; // Your space with SwapFacet
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
```

### 2. Router Whitelisting

Only whitelisted routers can be used. Currently whitelisted routers:
- LiFi

Check if a router is whitelisted:
```solidity
IPlatformRequirements(SPACE_FACTORY_ADDRESS).isRouterWhitelisted(routerAddress)
```

### 3. Space Membership (SwapFacet Only)

Space membership is **only required for SwapFacet** usage. SwapRouter can be used by anyone without membership.

### 4. Token Approvals

- **SwapRouter Standard Swaps**: Approve tokens to SwapRouter
- **SwapFacet Standard Swaps**: Approve tokens to SwapFacet (2 hops)
- **Permit2 Swaps (Both)**: Approve tokens to Permit2 contract (1 hop)

## Function Signatures

### SwapRouter (Permissionless)

```solidity
// SwapRouter standard swap
function executeSwap(
    ExactInputParams calldata params,
    RouterParams calldata routerParams,
    address poster
) external payable returns (uint256 amountOut, uint256 protocolFee);

// SwapRouter Permit2 swap  
function executeSwapWithPermit(
    ExactInputParams calldata params,
    RouterParams calldata routerParams,
    FeeConfig calldata posterFee,
    Permit2Params calldata permit
) external payable returns (uint256 amountOut, uint256 protocolFee);
```

### SwapFacet (Space Members Only)

```solidity
// SwapFacet standard swap (2 hops)
function executeSwap(
    ExactInputParams calldata params,
    RouterParams calldata routerParams,
    address poster
) external payable returns (uint256 amountOut);

// SwapFacet Permit2 swap (1 hop)
function executeSwapWithPermit(
    ExactInputParams calldata params,
    RouterParams calldata routerParams,
    FeeConfig calldata posterFee,
    Permit2Params calldata permit
) external payable returns (uint256 amountOut);
```

### Common Structs

```solidity
struct ExactInputParams {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 minAmountOut;
    address recipient;
}

struct RouterParams {
    address router;      // Whitelisted router address
    address approveTarget; // Address to approve tokens to
    bytes swapData;      // Encoded swap data for router
}

struct FeeConfig {
    address recipient;  // Poster address
    uint16 feeBps;     // Poster fee in basis points
}

struct Permit2Params {
    address owner;
    uint256 nonce;
    uint256 deadline;
    bytes signature;
}
```

## Choosing SwapRouter vs SwapFacet

### When to Use SwapRouter Directly

✅ **Use SwapRouter when:**
- User is not a space member
- You want maximum gas efficiency
- Working with fee-on-transfer tokens (avoid 2-hop penalty)
- Building a general DEX interface
- Want to avoid poster fees (pass `address(0)` as poster parameter)

### When to Use SwapFacet

✅ **Use SwapFacet when:**
- User is a space member
- You want poster fee rebates for the space
- You want automatic points distribution
- Building space-specific trading features
- Community benefits outweigh gas costs

### Fee-on-Transfer Token Considerations

For tokens with transfer fees (like SAFEMOON, SHIB variants):

```typescript
// BAD: 2 transfer taxes
SwapFacet.executeSwap() 
// User → SwapFacet (tax 1) → SwapRouter (tax 2) → DEX

// GOOD: 1 transfer tax
SwapRouter.executeSwap() 
// User → SwapRouter (tax 1) → DEX

// BEST: 1 transfer tax + space benefits
SwapFacet.executeSwapWithPermit()
// User → SwapRouter (tax 1, via Permit2) → DEX
```

## Integration Flows

### 1. SwapRouter ETH to Token (Permissionless)

```typescript
import { Address, createWalletClient } from 'viem';

async function swapETHToTokenDirect(
  amountIn: bigint,  // ETH amount in WEI
  tokenOut: Address,  // Output token address
  slippage: number = 0.003, // 0.3% slippage tolerance
  poster: Address = '0x0000000000000000000000000000000000000000' // No poster
) {
  // Step 1: Calculate fees for ETH input
  const { amountInAfterFees, protocolFee, posterFee } = await publicClient.readContract({
    address: SWAP_ROUTER_ADDRESS,
    abi: swapRouterAbi,
    functionName: 'getETHInputFees',
    args: [amountIn, walletClient.account.address, poster]
  });

  // Step 2: Get quote from aggregator using amountInAfterFees
  const quote = await fetchLiFiQuote({
    fromToken: '0x0000000000000000000000000000000000000000',
    toToken: tokenOut,
    amount: amountInAfterFees, // Use amount after fees!
    slippage: 0.15 // 15% slippage
  });

  // Step 3: Prepare parameters for simulation
  const params = {
    tokenIn: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeeeEeeeeeeeEEeE', // ETH address
    tokenOut,
    amountIn, // Original amount
    minAmountOut: 0n, // Will be set after simulation
    recipient: walletClient.account.address
  };

  const routerParams = {
    router: LIFI_ROUTER,
    approveTarget: LIFI_ROUTER,
    swapData: quote.transactionRequest.data
  };

  // Step 4: Simulate swap to get expected output
  const simulationResult = await publicClient.simulateContract({
    address: SWAP_ROUTER_ADDRESS,
    abi: swapRouterAbi,
    functionName: 'executeSwap',
    args: [params, routerParams, poster],
    value: amountIn
  });

  const expectedAmountOut = simulationResult.result[0]; // First return value is amountOut

  // Step 5: Calculate minAmountOut with slippage protection
  const minAmountOut = expectedAmountOut * BigInt(Math.floor((1 - slippage) * 10000)) / 10000n;

  // Step 6: Update params with calculated minAmountOut
  params.minAmountOut = minAmountOut;

  // Step 7: Execute swap directly on SwapRouter
  const hash = await walletClient.writeContract({
    address: SWAP_ROUTER_ADDRESS,
    abi: swapRouterAbi,
    functionName: 'executeSwap',
    args: [params, routerParams, poster],
    value: amountIn // Send ETH
  });

  return hash;
}
```

### 2. SwapFacet ETH to Token (Space Members + Benefits)

```typescript
async function swapETHToTokenViaSpace(
  amountIn: bigint,  // ETH amount in WEI
  tokenOut: Address,
  slippage: number = 0.003, // 0.3% slippage tolerance
  spaceAddress: Address,
  poster: Address = spaceAddress // Default poster is space itself
) {
  // Step 1: Calculate fees (same as direct)
  const { amountInAfterFees } = await publicClient.readContract({
    address: SWAP_ROUTER_ADDRESS,
    abi: swapRouterAbi,
    functionName: 'getETHInputFees',
    args: [amountIn, spaceAddress, poster]
  });

  // Step 2: Get quote using amountInAfterFees
  const quote = await fetchLiFiQuote({
    fromToken: '0x0000000000000000000000000000000000000000',
    toToken: tokenOut,
    amount: amountInAfterFees, // Use amount after fees!
    slippage: 0.15 // 15% slippage
  });

  // Step 3: Prepare parameters for simulation
  const params = {
    tokenIn: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    tokenOut,
    amountIn,
    minAmountOut: 0n, // Will be set after simulation
    recipient: walletClient.account.address
  };

  const routerParams = {
    router: LIFI_ROUTER,
    approveTarget: LIFI_ROUTER,
    swapData: quote.transactionRequest.data
  };

  // Step 4: Simulate swap to get expected output
  const simulationResult = await publicClient.simulateContract({
    address: spaceAddress,
    abi: swapFacetAbi,
    functionName: 'executeSwap',
    args: [params, routerParams, poster],
    value: amountIn
  });

  const expectedAmountOut = simulationResult.result[0]; // First return value is amountOut

  // Step 5: Calculate minAmountOut with slippage protection
  const minAmountOut = expectedAmountOut * BigInt(Math.floor((1 - slippage) * 10000)) / 10000n;

  // Step 6: Update params with calculated minAmountOut
  params.minAmountOut = minAmountOut;

  // Step 7: Execute via SwapFacet (gets points + poster fees)
  const hash = await walletClient.writeContract({
    address: spaceAddress,
    abi: swapFacetAbi,
    functionName: 'executeSwap',
    args: [params, routerParams, poster],
    value: amountIn
  });

  return hash;
}
```

### 3. Token Swaps with Permit2 (Token-to-Token or Token-to-ETH)

```typescript
import { SignatureTransfer } from '@uniswap/permit2-sdk';
import { Address } from 'viem';

async function swapTokenWithPermit2(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  slippage: number = 0.015, // 1.5% slippage tolerance
  spaceAddress: Address,
  posterFee: { recipient: Address, feeBps: number }
) {
  // Step 1: Ensure token is approved to Permit2
  await approveToken(tokenIn, PERMIT2_ADDRESS, MAX_UINT256);

  // Step 2: Get quote from aggregator
  const quote = await fetchLiFiQuote({
    fromToken: tokenIn,
    toToken: tokenOut,
    amount: amountIn,
    slippage: 0.15 // 15% slippage
  });

  // Step 3: Prepare parameters for simulation
  const params = {
    tokenIn,
    tokenOut,
    amountIn,
    minAmountOut: 0n, // Will be set after simulation
    recipient: walletClient.account.address
  };

  const routerParams = {
    router: LIFI_ROUTER,
    approveTarget: LIFI_ROUTER,
    swapData: quote.transactionRequest.data
  };

  // Step 4: Simulate swap to get expected output
  const simulationResult = await publicClient.simulateContract({
    address: spaceAddress,
    abi: swapFacetAbi,
    functionName: 'executeSwapWithPermit',
    args: [params, routerParams, posterFee, { owner: walletClient.account.address, nonce: 0n, deadline: 0n, signature: '0x' }]
  });

  const expectedAmountOut = simulationResult.result[0]; // First return value is amountOut

  // Step 5: Calculate minAmountOut with slippage protection
  const minAmountOut = expectedAmountOut * BigInt(Math.floor((1 - slippage) * 10000)) / 10000n;

  // Step 6: Update params with calculated minAmountOut
  params.minAmountOut = minAmountOut;

  // Step 7: Create witness data for Permit2
  const witness = {
    params,
    routerParams,
    posterFee
  };

  // Step 8: Generate permit signature
  const permit = {
    permitted: {
      token: tokenIn,
      amount: amountIn
    },
    spender: SWAP_ROUTER_ADDRESS,
    nonce: BigInt(Date.now()),
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600)
  };

  // Step 9: Sign permit with witness
  const { domain, types, values } = SignatureTransfer.getPermitData(
    permit,
    PERMIT2_ADDRESS,
    chainId
  );

  const signature = await walletClient.signTypedData({
    account: walletClient.account,
    domain,
    types: {
      ...types,
      SwapWitness: [
        { name: 'params', type: 'ExactInputParams' },
        { name: 'routerParams', type: 'RouterParams' },
        { name: 'posterFee', type: 'FeeConfig' }
      ]
    },
    primaryType: 'PermitWitnessTransferFrom',
    message: {
      ...values,
      witness
    }
  });

  // Step 10: Execute swap with permit
  const permitParams = {
    owner: walletClient.account.address,
    nonce: permit.nonce,
    deadline: permit.deadline,
    signature
  };

  const hash = await walletClient.writeContract({
    address: spaceAddress,
    abi: swapFacetAbi,
    functionName: 'executeSwapWithPermit',
    args: [params, routerParams, posterFee, permitParams]
  });

  return hash;
}
```

### 4. Decision Matrix Summary

| Scenario | Best Option | Reasoning |
|----------|-------------|-----------|
| Non-space member | SwapRouter.executeSwap | Only option available |
| Standard ERC20 + want efficiency | SwapRouter.executeSwap | 1 hop, lower gas |
| Standard ERC20 + want space benefits | SwapFacet.executeSwap | 2 hops, but gets points/fees |
| Fee-on-transfer token + no space benefits | SwapRouter.executeSwap | 1 hop, avoid double tax |
| Fee-on-transfer token + want space benefits | SwapFacet.executeSwapWithPermit | 1 hop via Permit2 + benefits |
| Maximum security + space benefits | SwapFacet.executeSwapWithPermit | Permit2 + witness binding |

## Fee Management

### Understanding Fee Structure

1. **Protocol Fee**: Platform-wide fee (set by protocol)
2. **Poster Fee**: Space-configurable fee that can either:
   - Go to space treasury (default)
   - Be forwarded to external poster

### Configuring Space Fees

Space owners can configure poster fees:

```typescript
// Space owner configures fees
await spaceOwner.writeContract({
  address: SPACE_ADDRESS,
  abi: swapFacetAbi,
  functionName: 'setSwapFeeConfig',
  args: [
    50, // 0.5% poster fee (50 basis points)
    false // forwardPosterFee: false = fees go to space
  ]
});
```

### ETH Swap Fee Calculation Example

```typescript
import { parseEther, formatEther, Address } from 'viem';

// Example: Swapping 1 ETH
const amountIn = parseEther('1');  // ETH amount in WEI

// Get fee breakdown
const fees = await publicClient.readContract({
  address: SWAP_ROUTER_ADDRESS,
  abi: swapRouterAbi,
  functionName: 'getETHInputFees',
  args: [amountIn, SPACE_ADDRESS, SPACE_ADDRESS]
});

console.log({
  originalAmount: formatEther(amountIn),
  amountAfterFees: formatEther(fees.amountInAfterFees),
  protocolFee: formatEther(fees.protocolFee),
  posterFee: formatEther(fees.posterFee)
});

// Output example:
// originalAmount: 1.0
// amountAfterFees: 0.99  (1% total fees)
// protocolFee: 0.005     (0.5%)
// posterFee: 0.005       (0.5%)
```

## Security Considerations

### 1. Router Validation

Always verify routers are whitelisted before use:

```typescript
import { Address } from 'viem';

async function isRouterValid(router: Address): Promise<boolean> {
  return await publicClient.readContract({
    address: SPACE_FACTORY_ADDRESS as Address,
    abi: platformRequirementsAbi,
    functionName: 'isRouterWhitelisted',
    args: [router]
  });
}
```

### 2. Deadline Management

For Permit2 swaps, use short deadlines:

```typescript
const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes
```

### 3. Fee Manipulation Protection

When using Permit2, the poster fee is validated against the space configuration, preventing bait-and-switch attacks.

## Best Practices

### 1. Gas Optimization

- Use Permit2 to avoid separate approval transactions
- Batch multiple operations when possible

### 2. User Experience

- Show clear fee breakdowns before swap
- Show poster fee distributions to spaces
- Provide swap history and analytics

### 3. Monitoring

Track important metrics:
- Swap volume by token pairs
- Fee collection (protocol + poster)
- Points distribution
- Failed transaction reasons
- Slippage statistics

## Conclusion

The Towns Protocol swap system provides flexible integration options for different use cases. Key implementation guidelines:

### Development Best Practices
- **Always simulate swaps** before execution to calculate proper slippage protection
- **Use the Decision Matrix** (Section 5) to choose the right approach for your use case
- **Calculate ETH fees first** when swapping from ETH using `getETHInputFees`
- **Validate routers** before use to ensure they're whitelisted
- **Test thoroughly** with different token types (standard, fee-on-transfer, rebasing)

### Integration Checklist
1. Choose integration approach based on user membership and requirements
2. Implement proper error handling for common failure scenarios
3. Set reasonable deadlines for Permit2 transactions (5-10 minutes)
4. Monitor transaction success rates and slippage performance
5. Provide clear fee breakdowns to users before swap execution

For additional support and the latest contract addresses, consult the contract source code or reach out to the Towns Protocol development team.
