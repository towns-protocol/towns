// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLink} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";

// libraries

// contracts

library WalletLinkProxyStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("spaces.facets.delegation.WalletLinkProxyStorage");

  struct Layout {
    IWalletLink walletLink;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
