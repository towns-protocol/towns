// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IMembershipBase} from "contracts/src/towns/facets/membership/IMembership.sol";
import {IManagedProxyBase} from "contracts/src/diamond/proxy/managed/IManagedProxy.sol";

// libraries

// contracts
interface ITownProxyBase {
  struct TokenOwnable {
    address townOwner;
    uint256 tokenId;
  }

  struct Forwarder {
    address trustedForwarder;
  }

  struct TownProxyInit {
    IManagedProxyBase.ManagedProxyInit managedProxy;
    TokenOwnable tokenOwnable;
    IMembershipBase.MembershipInfo membership;
    Forwarder forwarder;
  }
}

interface ITownProxy is ITownProxyBase {}
