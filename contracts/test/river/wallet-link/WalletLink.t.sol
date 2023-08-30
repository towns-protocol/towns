// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IWalletLinkBase} from "contracts/src/river/wallet-link/IWalletLink.sol";

// libraries

// contracts
import {WalletLinkSetup} from "./WalletLinkSetup.sol";

contract WalletLinkTest is IWalletLinkBase, WalletLinkSetup {
  function test_linkForAll() external {
    address wallet = _randomAddress();
    address rootKey = _randomAddress();

    // act as the wallet owner
    vm.prank(wallet);
    // delegate to rootKey
    walletLink.linkForAll(rootKey, true);

    // check if the root key was delegated by the wallet
    assertTrue(walletLink.checkLinkForAll(rootKey, wallet));
  }

  function test_revokeForall() external {
    address wallet = _randomAddress();
    address rootKey = _randomAddress();

    vm.prank(wallet);
    walletLink.linkForAll(rootKey, true);

    assertTrue(walletLink.checkLinkForAll(rootKey, wallet));

    vm.prank(wallet);
    walletLink.linkForAll(rootKey, false);

    assertFalse(walletLink.checkLinkForAll(rootKey, wallet));
  }

  function test_getLinksByRootKey() external {
    address wallet = _randomAddress();
    address rootKey = _randomAddress();

    vm.prank(wallet);
    walletLink.linkForAll(rootKey, true);

    // get all the rootkeys made to the wallet
    WalletLinkInfo[] memory info = walletLink.getLinksByRootKey(rootKey);

    assertTrue(info.length == 1);
    assertEq(info[0].wallet, wallet);
    assertEq(info[0].rootKey, rootKey);
  }

  function test_multipleDelegations() external {
    address wallet = _randomAddress();
    address rootKey1 = _randomAddress();
    address rootKey2 = _randomAddress();

    vm.prank(wallet);
    walletLink.linkForAll(rootKey1, true);

    vm.prank(wallet);
    vm.expectRevert(
      abi.encodeWithSelector(LinkAlreadyExists.selector, wallet, rootKey2)
    );
    walletLink.linkForAll(rootKey2, true);
  }
}
