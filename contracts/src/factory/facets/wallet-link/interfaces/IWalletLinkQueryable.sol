// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkBase} from "../IWalletLink.sol";

// libraries

// contracts

interface IWalletLinkQueryable is IWalletLinkBase {
  function explicitWalletsByRootKey(
    address rootKey
  ) external view returns (WalletData[] memory wallets);
}
