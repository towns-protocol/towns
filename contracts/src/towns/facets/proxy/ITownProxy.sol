// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
interface ITownProxyBase {
  struct ManagedProxy {
    bytes4 managerSelector;
    address manager;
  }

  struct TokenOwnable {
    address townOwner;
    uint256 tokenId;
  }

  struct Membership {
    string name;
    uint256 price;
    uint256 limit;
    address currency;
    address feeRecipient;
  }

  struct Forwarder {
    address trustedForwarder;
  }

  struct TownProxyInit {
    ManagedProxy managedProxy;
    TokenOwnable tokenOwnable;
    Membership membership;
    Forwarder forwarder;
  }
}

interface ITownProxy is ITownProxyBase {}
