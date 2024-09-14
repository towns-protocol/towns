// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IManagedProxyBase} from "contracts/src/diamond/proxy/managed/IManagedProxy.sol";
import {ITokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/ITokenOwnable.sol";
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
