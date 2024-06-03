// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegationBase} from "./IMainnetDelegation.sol";
import {IProxyDelegation} from "contracts/src/tokens/river/mainnet/delegation/IProxyDelegation.sol";
import {ICrossDomainMessenger} from "contracts/src/tokens/river/mainnet/delegation/ICrossDomainMessenger.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library MainnetDelegationStorage {
  // keccak256(abi.encode(uint256(keccak256("tokens.river.base.delegation.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x264df150e9e008a39dd109254e3af3cdadbfbd33261903d1163f43eaee68e700;

  struct Layout {
    mapping(address operator => EnumerableSet.AddressSet) delegatorsByOperator;
    mapping(address delegator => IMainnetDelegationBase.Delegation delegation) delegationByDelegator;
    mapping(address delegator => address claimer) claimerByDelegator;
    IProxyDelegation deprecatedproxyDelegation; // Do not use this, use proxyDelegation
    ICrossDomainMessenger messenger;
    mapping(address claimer => EnumerableSet.AddressSet delegators) delegatorsByAuthorizedClaimer;
    address proxyDelegation;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}
