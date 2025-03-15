// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkBase} from "../IWalletLink.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
// contracts

library WalletLib {
  using EnumerableSet for EnumerableSet.Bytes32Set;

  struct Wallet {
    string addr; // Base58/Bech32/etc. encoded address
    IWalletLinkBase.VirtualMachineType vmType; // Type of VM this wallet belongs to
  }

  struct RootWallet {
    EnumerableSet.Bytes32Set walletHashes;
    address defaultWallet;
    mapping(bytes32 => Wallet) walletByHash;
  }

  function addWallet(
    RootWallet storage self,
    bytes32 walletHash,
    string calldata addr,
    IWalletLinkBase.VirtualMachineType vmType
  ) internal {
    self.walletHashes.add(walletHash);
    self.walletByHash[walletHash] = Wallet(addr, vmType);
  }

  function removeWallet(RootWallet storage self, bytes32 walletHash) internal {
    self.walletHashes.remove(walletHash);
    delete self.walletByHash[walletHash];
  }

  function exists(
    RootWallet storage self,
    bytes32 walletHash
  ) internal view returns (bool) {
    return self.walletHashes.contains(walletHash);
  }
}
