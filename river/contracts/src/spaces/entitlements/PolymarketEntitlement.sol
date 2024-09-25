// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ICrossChainEntitlement} from "contracts/src/spaces/entitlements/ICrossChainEntitlement.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IGnosisSafeProxyFactory {
  function computeProxyAddress(address user) external view returns (address);
}

contract PolymarketEntitlement is ICrossChainEntitlement {
  IGnosisSafeProxyFactory public proxyFactory;
  IERC1155 public tokenContract;

  constructor() {
    // Set the proxyFactory and token contract addresses
    proxyFactory = IGnosisSafeProxyFactory(
      address(0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b)
    );
    tokenContract = IERC1155(
      address(0x4D97DCd97eC945f40cF65F87097ACe5EA0476045)
    );
  }

  function isEntitled(
    address[] calldata users,
    bytes calldata paramData
  ) external view override returns (bool) {
    (uint256 tokenId, uint256 requiredBalance, bool aggregate) = abi.decode(
      paramData,
      (uint256, uint256, bool)
    );

    uint256 totalBalance = 0;

    for (uint256 i = 0; i < users.length; i++) {
      address userAddress = users[i];
      address proxyAddress = proxyFactory.computeProxyAddress(userAddress);

      // Check balance for both the user and the proxy
      uint256 userBalance = tokenContract.balanceOf(userAddress, tokenId);
      uint256 proxyBalance = tokenContract.balanceOf(proxyAddress, tokenId);

      if (aggregate) {
        // Add both user and proxy balance to the total
        totalBalance += userBalance + proxyBalance;
      } else {
        // If not aggregating, return true if any address meets the threshold
        if (userBalance >= requiredBalance || proxyBalance >= requiredBalance) {
          return true;
        }
      }
    }

    // If aggregating, check if the total balance meets the threshold
    if (aggregate) {
      return totalBalance >= requiredBalance;
    }

    // If not aggregating, and no address met the threshold, return false
    return false;
  }

  function parameters() external pure override returns (Parameter[] memory) {
    Parameter[] memory params = new Parameter[](3);
    params[0] = Parameter({
      name: "tokenId",
      primitive: "uint256",
      description: "The token ID of the ERC-1155 token."
    });
    params[1] = Parameter({
      name: "requiredBalance",
      primitive: "uint256",
      description: "The minimum balance required for entitlement."
    });
    params[2] = Parameter({
      name: "aggregate",
      primitive: "bool",
      description: "Whether to aggregate balances across all wallets."
    });
    return params;
  }
}
