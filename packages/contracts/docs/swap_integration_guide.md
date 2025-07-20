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

⚠️ **Important for Fee-on-Transfer Tokens**: Multiple hops cause multiple tax events. Prefer Permit2 method or direct SwapRouter usage for fee-on-transfer tokens.

## Prerequisites

### 1. Contract Addresses

```typescript
// Base addresses (update for your network)
const SWAP_ROUTER_ADDRESS = "0x95A2a333D30c8686dE8D01AC464d6034b9aA7b24"; // SwapRouter diamond
const SPACE_ADDRESS = "0x..."; // Your space with SwapFacet
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
```

### 2. Router Whitelisting

Only whitelisted routers can be used. Currently whitelisted routers:
- LiFi

Check if a router is whitelisted:
```solidity
IPlatformRequirements(0x9978c826d93883701522d2CA645d5436e5654252).isRouterWhitelisted(routerAddress)
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
  minAmountOut: bigint,
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
    fromToken: 'ETH',
    toToken: tokenOut,
    amount: amountInAfterFees, // Use amount after fees!
    slippage: 1 // 1% slippage
  });

  // Step 3: Prepare swap parameters
  const params = {
    tokenIn: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH address
    tokenOut: tokenOut,
    amountIn: amountIn, // Original amount
    minAmountOut: minAmountOut,
    recipient: walletClient.account.address
  };

  const routerParams = {
    router: LIFI_ROUTER,
    approveTarget: LIFI_ROUTER,
    swapData: quote.transactionRequest.data
  };

  // Step 4: Execute swap directly on SwapRouter
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
  amountIn: bigint,
  tokenOut: Address,
  minAmountOut: bigint,
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
    fromToken: 'ETH',
    toToken: tokenOut,
    amount: amountInAfterFees,
    slippage: 1
  });

  // Step 3: Prepare parameters
  const params = {
    tokenIn: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    tokenOut: tokenOut,
    amountIn: amountIn,
    minAmountOut: minAmountOut,
    recipient: walletClient.account.address
  };

  const routerParams = {
    router: LIFI_ROUTER,
    approveTarget: LIFI_ROUTER,
    swapData: quote.transactionRequest.data
  };

  // Step 4: Execute via SwapFacet (gets points + poster fees)
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

### 3. Token to Token Swap Comparison

#### Standard ERC20 Tokens

```typescript
// Option A: Direct SwapRouter (1 hop)
async function swapTokenDirect(tokenIn: Address, tokenOut: Address, amountIn: bigint) {
  // Approve tokens to SwapRouter
  await approveToken(tokenIn, SWAP_ROUTER_ADDRESS, amountIn);
  
  const quote = await fetchLiFiQuote({ ... });
  
  return await walletClient.writeContract({
    address: SWAP_ROUTER_ADDRESS,
    abi: swapRouterAbi,
    functionName: 'executeSwap',
    args: [params, routerParams, '0x0000000000000000000000000000000000000000']
  });
}

// Option B: Via SwapFacet (2 hops, but gets points/poster fees)
async function swapTokenViaSpace(tokenIn: string, tokenOut: string, amountIn: bigint, spaceAddress: string) {
  // Approve tokens to SwapFacet
  await approveToken(tokenIn, spaceAddress, amountIn);
  
  const quote = await fetchLiFiQuote({ ... });
  [logs-364f0a73-d3d9-482d-88f5-e9ac46b0866e.json](../../../../../../Downloads/logs-364f0a73-d3d9-482d-88f5-e9ac46b0866e.json)
  return await walletClient.writeContract({
    address: spaceAddress,
    abi: swapFacetAbi,
    functionName: 'executeSwap',
    args: [params, routerParams, spaceAddress]
  });
}
```

#### Fee-on-Transfer Tokens (IMPORTANT)

For tokens that charge fees on transfer, avoid the 2-hop penalty:

```typescript
// BAD: Double taxation on fee-on-transfer tokens
async function swapFeeTokenBad(tokenIn: string, tokenOut: string, amountIn: bigint, spaceAddress: string) {
  await approveToken(tokenIn, spaceAddress, amountIn);
  
  // This causes TWO transfer fees:
  // 1. User → SwapFacet (tax applied)
  // 2. SwapFacet → SwapRouter (tax applied again!)
  return await walletClient.writeContract({
    address: spaceAddress,
    abi: swapFacetAbi,
    functionName: 'executeSwap', // DON'T DO THIS for fee-on-transfer tokens
    args: [params, routerParams, spaceAddress]
  });
}

// GOOD: Single taxation
async function swapFeeTokenGood(tokenIn: string, tokenOut: string, amountIn: bigint) {
  await approveToken(tokenIn, SWAP_ROUTER_ADDRESS, amountIn);
  
  // Only one transfer fee: User → SwapRouter
  return await walletClient.writeContract({
    address: SWAP_ROUTER_ADDRESS,
    abi: swapRouterAbi,
    functionName: 'executeSwap',
    args: [params, routerParams, '0x0000000000000000000000000000000000000000']
  });
}

// BEST: Single taxation + space benefits
async function swapFeeTokenBest(tokenIn: string, tokenOut: string, amountIn: bigint, spaceAddress: string) {
  await approveToken(tokenIn, PERMIT2_ADDRESS, MAX_UINT256);
  
  // Use Permit2 to skip the extra hop while getting space benefits
  return await walletClient.writeContract({
    address: spaceAddress,
    abi: swapFacetAbi,
    functionName: 'executeSwapWithPermit', // Permit2 bypasses the extra hop
    args: [params, routerParams, posterFee, permitParams]
  });
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

### 5. Legacy Token to Token Example

```typescript
async function swapTokenToToken(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  minAmountOut: bigint,
  poster: string = SPACE_ADDRESS
) {
  // Step 1: Approve tokens to SwapFacet
  await approveToken(tokenIn, SPACE_ADDRESS, amountIn);

  // Step 2: Get quote from aggregator
  const quote = await get0xQuote({
    sellToken: tokenIn,
    buyToken: tokenOut,
    sellAmount: amountIn,
    slippagePercentage: 0.01
  });

  // Step 3: Prepare parameters
  const params = {
    tokenIn: tokenIn,
    tokenOut: tokenOut,
    amountIn: amountIn,
    minAmountOut: minAmountOut,
    recipient: walletClient.account.address
  };

  const routerParams = {
    router: ZEROX_EXCHANGE_PROXY,
    approveTarget: quote.allowanceTarget,
    swapData: quote.data
  };

  // Step 4: Execute swap
  const hash = await walletClient.writeContract({
    address: SPACE_ADDRESS,
    abi: swapFacetAbi,
    functionName: 'executeSwap',
    args: [params, routerParams, poster]
  });

  return hash;
}
```

### 3. Permit2 Swap Integration

```typescript
import { SignatureTransfer } from '@uniswap/permit2-sdk';

async function swapWithPermit2(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  minAmountOut: bigint,
  posterFee: { recipient: string, feeBps: number }
) {
  // Step 1: Ensure token is approved to Permit2
  await approveToken(tokenIn, PERMIT2_ADDRESS, MAX_UINT256);

  // Step 2: Get swap quote
  const quote = await getParaswapQuote({
    srcToken: tokenIn,
    destToken: tokenOut,
    amount: amountIn,
    side: 'SELL'
  });

  // Step 3: Prepare swap parameters
  const params = {
    tokenIn,
    tokenOut,
    amountIn,
    minAmountOut,
    recipient: account.address
  };

  const routerParams = {
    router: PARASWAP_ROUTER,
    approveTarget: PARASWAP_TOKEN_TRANSFER_PROXY,
    swapData: quote.data
  };

  // Step 4: Create witness data for Permit2
  const witness = {
    params,
    routerParams,
    posterFee
  };

  // Step 5: Generate permit signature
  const permit = {
    permitted: {
      token: tokenIn,
      amount: amountIn
    },
    spender: SWAP_ROUTER_ADDRESS,
    nonce: BigInt(Date.now()),
    deadline: BigInt(Math.floor(Date.now() / 1000) + 600)
  };

  // Step 6: Sign permit with witness
  const { domain, types, values } = SignatureTransfer.getPermitData(
    permit,
    PERMIT2_ADDRESS,
    chainId
  );

  // Add witness to signature
  const signature = await walletClient.signTypedData({
    account,
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

  // Step 7: Execute swap with permit
  const permitParams = {
    owner: account.address,
    nonce: permit.nonce,
    deadline: permit.deadline,
    signature
  };

  const hash = await walletClient.writeContract({
    address: SPACE_ADDRESS,
    abi: swapFacetAbi,
    functionName: 'executeSwapWithPermit',
    args: [params, routerParams, posterFee, permitParams]
  });

  return hash;
}
```

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
  address: SWAP_ROUTER_ADDRESS as Address,
  abi: swapRouterAbi,
  functionName: 'getETHInputFees',
  args: [amountIn, SPACE_ADDRESS as Address, SPACE_ADDRESS as Address]
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
    address: PLATFORM_REQUIREMENTS_ADDRESS as Address,
    abi: platformRequirementsAbi,
    functionName: 'isRouterWhitelisted',
    args: [router]
  });
}
```

### 2. Slippage Protection

Always set reasonable `minAmountOut`:

```typescript
function calculateMinAmountOut(expectedOut: bigint, slippageBps: number): bigint {
  return expectedOut * BigInt(10000 - slippageBps) / 10000n;
}

// Example: 1% slippage
const minAmountOut = calculateMinAmountOut(quotedAmount, 100);
```

### 3. Deadline Management

For Permit2 swaps, use short deadlines:

```typescript
const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes
```

### 4. Fee Manipulation Protection

When using Permit2, the poster fee is validated against the space configuration, preventing bait-and-switch attacks.

## Error Handling

```typescript
try {
  const hash = await executeSwap(params, routerParams, poster);
} catch (error) {
  if (error.message.includes('Entitlement__NotMember')) {
    console.error('User is not a space member');
  } else if (error.message.includes('SwapFacet__SwapRouterNotSet')) {
    console.error('SwapRouter not configured');
  } else if (error.message.includes('SwapRouter__InvalidRouter')) {
    console.error('Router not whitelisted');
  } else if (error.message.includes('SwapRouter__InsufficientOutput')) {
    console.error('Slippage exceeded');
  } else if (error.message.includes('SwapFacet__InvalidPosterInput')) {
    console.error('Invalid poster configuration');
  }
}
```

## Best Practices

### 1. Gas Optimization

- Batch multiple operations when possible
- Use Permit2 for gasless approvals
- Consider using multicall for complex operations

### 2. User Experience

- Show clear fee breakdowns before swap
- Display savings from poster fees
- Provide swap history and analytics

### 3. Testing

```typescript
import { parseEther, Address } from 'viem';

// Test different scenarios
describe('Swap Integration', () => {
  it('handles ETH swaps with correct fees', async () => {
    const fees = await getETHInputFees(parseEther('1'));  // ETH amount in WEI
    expect(fees.amountInAfterFees).toBeLessThan(parseEther('1'));
  });

  it('validates router whitelisting', async () => {
    const isValid = await isRouterWhitelisted(UNKNOWN_ROUTER as Address);
    expect(isValid).toBe(false);
  });

  it('handles partial swaps and refunds', async () => {
    // Test with routers that consume less than maxAmountIn
  });
});
```

### 4. Monitoring

Track important metrics:
- Swap volume by token pairs
- Fee collection (protocol + poster)
- Points distribution
- Failed transaction reasons
- Slippage statistics

## Advanced Topics

### Partial Swaps and Refunds

SwapFacet handles refunds for partial swaps automatically:

```typescript
// If router only uses 0.9 ETH of 1 ETH sent
// User automatically receives 0.1 ETH refund
// Poster fees are preserved in space for poster=space scenario
```

### Fee-on-Transfer Token Support

The system automatically handles fee-on-transfer tokens by measuring actual received amounts.

### Points Integration

ETH-involved swaps automatically mint points based on protocol fees:

```typescript
// Points minted for:
// - ETH → Token swaps
// - Token → ETH swaps
// - Based on protocol fee amount
```

## Conclusion

The Towns Protocol swap system provides both permissionless (SwapRouter) and space-enhanced (SwapFacet) options for token swaps. Key takeaways:

### SwapRouter (Permissionless)
- ✅ Open to anyone
- ✅ Maximum gas efficiency (1 hop)
- ✅ Best for fee-on-transfer tokens
- ❌ No space benefits (points, poster fees)

### SwapFacet (Space Members)
- ✅ Automatic points distribution
- ✅ Configurable poster fee rebates
- ✅ Community-driven benefits
- ❌ Requires space membership
- ❌ 2 hops for standard swaps (bad for fee-on-transfer tokens)

### Best Practices
- Use **SwapRouter** for maximum efficiency and fee-on-transfer tokens
- Use **SwapFacet** when space membership benefits outweigh gas costs
- Use **Permit2 methods** to get the best of both worlds
- Always calculate ETH fees before getting aggregator quotes
- Test with different token types (standard, fee-on-transfer, rebasing)

For additional support, consult the contract source code or reach out to the Towns Protocol development team.
