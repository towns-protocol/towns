# PermitAndStake Integration Guide

This guide explains how to integrate with the new `permitAndStake` function in the Towns Protocol RewardsDistribution contract, which uses Permit2 for gasless token approvals and enhanced smart contract wallet support.

## Overview

The `permitAndStake` function allows users to approve and stake tokens in a single transaction using Uniswap's Permit2 protocol. This provides several advantages over traditional EIP-2612 permits:

- **Smart Contract Wallet Support**: Works with smart contracts via ERC-1271 signature verification
- **Universal Token Approval**: Uses Permit2 as a universal approval router
- **Enhanced Security**: Cryptographically binds signatures to specific spenders and amounts
- **Gasless Approval**: No separate approval transaction required

## Prerequisites

Before using `permitAndStake`, ensure:

1. **Towns Token Approval**: No pre-approval needed. The Towns token gives Permit2 infinite allowance by default, so users can directly call `permitAndStake` without any prior approval transactions.

2. **Permit2 Deployment**: Permit2 is deployed at the deterministic address `0x000000000022D473030F116dDEE9F6B43aC78BA3` on all networks.

## Function Signature

```solidity
function permitAndStake(
  uint96 amount, // Amount of Towns tokens to stake
  address delegatee, // Operator or space to delegate to
  address beneficiary, // Address that receives staking rewards
  uint256 nonce, // Unique nonce for replay protection
  uint256 deadline, // Expiration timestamp for the permit
  bytes calldata signature // Permit2 signature
) external returns (uint256 depositId);
```

## Integration Guide

### TypeScript/JavaScript Integration

#### Dependencies

```bash
yarn add @uniswap/permit2-sdk viem
```

#### Complete Integration Example

```typescript
import {
  PERMIT2_ADDRESS,
  SignatureTransfer,
  PermitTransferFrom,
} from "@uniswap/permit2-sdk";
import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

// Contract addresses
const REWARDS_DISTRIBUTION_ADDRESS = "0x..."; // Your deployed contract
const TOWNS_TOKEN_ADDRESS = "0x..."; // Towns token address

// Create wallet client
const account = privateKeyToAccount("0x...");
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(),
});

async function permitAndStake({
  amount, // Amount to stake (in token units, e.g., "100")
  delegatee, // Operator or space address
  beneficiary, // Beneficiary address
}) {
  // 1. Convert amount to proper units
  const amountWei = parseUnits(amount, 18); // Towns token has 18 decimals

  // 2. Generate unique nonce (you can use timestamp + random)
  const nonce =
    BigInt(Math.floor(Date.now() / 1000)) * 1000000n +
    BigInt(Math.floor(Math.random() * 1000000));

  // 3. Set deadline (e.g., 10 minutes from now)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

  // 4. Create permit data structure
  const permit: PermitTransferFrom = {
    permitted: {
      token: TOWNS_TOKEN_ADDRESS,
      amount: amountWei,
    },
    spender: REWARDS_DISTRIBUTION_ADDRESS,
    nonce: nonce,
    deadline: deadline,
  };

  // 5. Create domain for signing
  const domain = {
    name: "Permit2",
    version: "1",
    chainId: base.id,
    verifyingContract: PERMIT2_ADDRESS as `0x${string}`,
  };

  // 6. Sign the permit
  const signature = await walletClient.signTypedData({
    account,
    domain,
    types: SignatureTransfer.getPermitData(permit, PERMIT2_ADDRESS, base.id)
      .types,
    primaryType: "PermitTransferFrom",
    message: SignatureTransfer.getPermitData(permit, PERMIT2_ADDRESS, base.id)
      .values,
  });

  // 7. Call permitAndStake
  const txHash = await walletClient.writeContract({
    address: REWARDS_DISTRIBUTION_ADDRESS,
    abi: [
      {
        name: "permitAndStake",
        type: "function",
        inputs: [
          { name: "amount", type: "uint96" },
          { name: "delegatee", type: "address" },
          { name: "beneficiary", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "signature", type: "bytes" },
        ],
        outputs: [{ name: "depositId", type: "uint256" }],
      },
    ],
    functionName: "permitAndStake",
    args: [amountWei, delegatee, beneficiary, nonce, deadline, signature],
  });

  return txHash;
}

// Usage example
async function main() {
  const txHash = await permitAndStake({
    amount: "100", // Stake 100 Towns tokens
    delegatee: "0x123...", // Operator address
    beneficiary: "0x456...", // Beneficiary address
  });

  console.log("Transaction hash:", txHash);
}
```

#### Wallet Integration (MetaMask/WalletConnect)

```typescript
import { useAccount, useSignTypedData, useWriteContract } from 'wagmi';

function StakeWithPermit() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();

  const handleStakeWithPermit = async (amount: string, delegatee: string) => {
    try {
      // Prepare permit data
      const amountWei = parseUnits(amount, 18);
      const nonce = BigInt(Date.now());
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

      const permit = {
        permitted: {
          token: TOWNS_TOKEN_ADDRESS,
          amount: amountWei,
        },
        spender: REWARDS_DISTRIBUTION_ADDRESS,
        nonce,
        deadline,
      };

      // Sign permit
      const signature = await signTypedDataAsync({
        domain: {
          name: 'Permit2',
          version: '1',
          chainId: base.id,
          verifyingContract: PERMIT2_ADDRESS,
        },
        types: SignatureTransfer.getPermitData(permit, PERMIT2_ADDRESS, base.id).types,
        primaryType: 'PermitTransferFrom',
        message: SignatureTransfer.getPermitData(permit, PERMIT2_ADDRESS, base.id).values,
      });

      // Execute stake
      const txHash = await writeContractAsync({
        address: REWARDS_DISTRIBUTION_ADDRESS,
        abi: rewardsDistributionAbi,
        functionName: 'permitAndStake',
        args: [amountWei, delegatee, address, nonce, deadline, signature]
      });

      console.log('Staking successful:', txHash);
    } catch (error) {
      console.error('Staking failed:', error);
    }
  };

  return (
    <button onClick={() => handleStakeWithPermit("100", "0x...")}>
      Stake with Permit
    </button>
  );
}
```

## Security Considerations

### 1. Nonce Management

- **Uniqueness**: Each permit must use a unique nonce
- **Collision Prevention**: Use timestamp-based or incrementing nonces
- **Replay Protection**: Never reuse nonces

### 2. Deadline Validation

- **Short Expiry**: Use reasonable deadlines (5-30 minutes)
- **Clock Skew**: Account for minor time differences between client and blockchain

### 3. Signature Security

- **Private Key Protection**: Never expose private keys in frontend code
- **Secure Signing**: Use hardware wallets or secure key management for production
- **Verification**: Always verify signature validity before submission

### 4. Front-running Protection

The permit signature cryptographically binds to `msg.sender`, preventing front-running attacks. An attacker cannot use someone else's signature because verification will fail.

## Error Handling

Common errors and solutions:

```typescript
try {
  const txHash = await permitAndStake(...);
} catch (error) {
  if (error.message.includes('InvalidSignature')) {
    // Signature verification failed - check signing process
    console.error('Invalid permit signature');
  } else if (error.message.includes('ExpiredDeadline')) {
    // Deadline passed - generate new permit
    console.error('Permit expired, please try again');
  } else if (error.message.includes('InvalidNonce')) {
    // Nonce already used or invalid
    console.error('Invalid nonce, generate a new one');
  }
}
```

## Best Practices

1. **Gas Optimization**: Batch multiple operations when possible
2. **User Experience**: Show clear signing prompts explaining what users are approving
3. **Error Messages**: Provide user-friendly error messages
4. **Fallback**: Offer traditional `approve` + `stake` flow as backup
5. **Testing**: Test with different wallet types (EOA, smart contract wallets)

This integration enables gasless token approvals and enhanced compatibility with smart contract wallets, providing a superior user experience for staking in the Towns Protocol.
