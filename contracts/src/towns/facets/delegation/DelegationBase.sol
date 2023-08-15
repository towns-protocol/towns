// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDelegationBase} from "./IDelegation.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {DelegationStorage} from "./DelegationStorage.sol";

// contracts

abstract contract DelegationBase is IDelegationBase {
  using EnumerableSet for EnumerableSet.Bytes32Set;

  // =============================================================
  //                      External - Write
  // =============================================================
  function _delegateForAll(address delegate, bool value) internal {
    bytes32 delegationHash = _computeAllDelegationHash(msg.sender, delegate);
    _setDelegation(delegate, delegationHash, value, msg.sender);
    emit DelegateForAll(msg.sender, delegate, value);
  }

  // =============================================================
  //                       External - Read
  // =============================================================

  function _getDelegationsByDelegate(
    address delegate
  ) internal view returns (DelegationInfo[] memory info) {
    DelegationStorage.Layout storage ds = DelegationStorage.layout();

    EnumerableSet.Bytes32Set storage delegationHashes = ds.delegationHashes[
      delegate
    ];
    info = new DelegationInfo[](delegationHashes.length());

    for (uint256 i = 0; i < delegationHashes.length(); ) {
      bytes32 delegationHash = delegationHashes.at(i);
      info[i] = ds.delegationInfo[delegationHash];

      unchecked {
        i++;
      }
    }
  }

  function _getDelegatesFor(
    address vault
  ) internal view returns (address[] memory delegates) {
    DelegationStorage.Layout storage ds = DelegationStorage.layout();

    EnumerableSet.Bytes32Set storage delegationHashes = ds.delegations[vault][
      ds.vaultVersion[vault]
    ];
    uint256 potentialDelegatesLength = delegationHashes.length();
    delegates = new address[](potentialDelegatesLength);

    for (uint256 i = 0; i < potentialDelegatesLength; ) {
      bytes32 delegationHash = delegationHashes.at(i);
      delegates[i] = ds.delegationInfo[delegationHash].delegate;

      unchecked {
        i++;
      }
    }
  }

  function _checkDelegateForAll(
    address delegate,
    address vault
  ) internal view returns (bool) {
    DelegationStorage.Layout storage ds = DelegationStorage.layout();

    bytes32 delegationHash = keccak256(
      abi.encode(
        delegate,
        vault,
        ds.vaultVersion[vault],
        ds.delegateVersion[vault][delegate]
      )
    );

    return
      ds.delegations[vault][ds.vaultVersion[vault]].contains(delegationHash);
  }

  // =============================================================
  //                           Internal
  // =============================================================

  /**
   * @dev Helper function to set delegation for a wallet
   */
  function _setDelegation(
    address delegate,
    bytes32 delegationHash,
    bool value,
    address vault
  ) internal {
    DelegationStorage.Layout storage ds = DelegationStorage.layout();

    if (value) {
      if (ds.delegations[vault][ds.vaultVersion[vault]].length() > 0)
        revert DelegateAlreadyExists(vault, delegate);

      ds.delegations[vault][ds.vaultVersion[vault]].add(delegationHash);
      ds.delegationHashes[delegate].add(delegationHash);
      ds.delegationInfo[delegationHash] = DelegationInfo(vault, delegate);
    } else {
      ds.delegations[vault][ds.vaultVersion[vault]].remove(delegationHash);
      ds.delegationHashes[delegate].remove(delegationHash);
      delete ds.delegationInfo[delegationHash];
    }
  }

  /**
   * @dev Helper function to compute delegation hash for wallet delegation
   */
  function _computeAllDelegationHash(
    address vault,
    address delegate
  ) internal view returns (bytes32) {
    DelegationStorage.Layout storage ds = DelegationStorage.layout();

    uint256 vaultVersion_ = ds.vaultVersion[vault];
    uint256 delegateVersion_ = ds.delegateVersion[vault][delegate];

    return
      keccak256(abi.encode(delegate, vault, vaultVersion_, delegateVersion_));
  }

  /**
   * @dev Helper function to revoke all delegates for a wallet
   */
  function _revokeAllDelegates() internal {
    DelegationStorage.Layout storage ds = DelegationStorage.layout();
    ++ds.vaultVersion[msg.sender];
    emit RevokeAllDelegates(msg.sender);
  }

  /**
   * @dev Helper function to revoke a delegate for a wallet
   */
  function _revokeDelegate(address delegate, address vault) internal {
    DelegationStorage.Layout storage ds = DelegationStorage.layout();
    ++ds.delegateVersion[vault][delegate];
    emit RevokeDelegate(vault, msg.sender);
  }
}
