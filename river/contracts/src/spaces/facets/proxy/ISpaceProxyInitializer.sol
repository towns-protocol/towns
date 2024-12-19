// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IManagedProxyBase} from "@river-build/diamond/src/proxy/managed/IManagedProxy.sol";
import {ITokenOwnableBase} from "@river-build/diamond/src/facets/ownable/token/ITokenOwnable.sol";
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";

// libraries

// contracts

interface ISpaceProxyInitializer is
  ITokenOwnableBase,
  IMembershipBase,
  IManagedProxyBase
{
  function initialize(
    address owner,
    address manager,
    TokenOwnable memory tokenOwnable,
    Membership memory membership
  ) external;
}
