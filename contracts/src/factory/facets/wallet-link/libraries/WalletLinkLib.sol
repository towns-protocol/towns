// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDelegateRegistry} from "contracts/src/factory/facets/wallet-link/interfaces/IDelegateRegistry.sol";
import {ISCL_EIP6565} from "contracts/src/factory/facets/wallet-link/interfaces/ISCL_EIP6565.sol";

// libraries
import {WalletLinkStorage} from "../WalletLinkStorage.sol";

// contracts

library WalletLinkLib {
  /// @dev Dependency name of delegate.xyz v2 registry
  bytes32 internal constant DELEGATE_REGISTRY_V2 =
    bytes32("DELEGATE_REGISTRY_V2");

  /// @dev Dependency name of SCL EIP6565
  bytes32 internal constant SCL_EIP6565 = bytes32("SCL_EIP6565");

  function verifySolanaSignature(
    string memory message,
    uint256 r,
    uint256 s,
    uint256[5] memory extPubKey
  ) internal returns (bool) {
    ISCL_EIP6565 sclEIP6565 = ISCL_EIP6565(getDependency(SCL_EIP6565));
    return sclEIP6565.Verify_LE(message, r, s, extPubKey);
  }

  function getDelegationsForWallets(
    address[] memory wallets
  )
    internal
    view
    returns (IDelegateRegistry.Delegation[][] memory allDelegations)
  {
    IDelegateRegistry delegateRegistry = IDelegateRegistry(
      WalletLinkStorage.layout().dependencies[DELEGATE_REGISTRY_V2]
    );
    uint256 walletsLength = wallets.length;
    allDelegations = new IDelegateRegistry.Delegation[][](walletsLength);

    for (uint256 i; i < walletsLength; ++i) {
      allDelegations[i] = delegateRegistry.getIncomingDelegations(wallets[i]);
    }
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                      Dependencies Functions                */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function getDependency(bytes32 dependency) internal view returns (address) {
    return WalletLinkStorage.layout().dependencies[dependency];
  }

  function setDependency(
    bytes32 dependency,
    address dependencyAddress
  ) internal {
    WalletLinkStorage.layout().dependencies[dependency] = dependencyAddress;
  }
}
