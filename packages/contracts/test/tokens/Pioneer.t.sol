// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {Pioneer} from "contracts/src/tokens/Pioneer.sol";
import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {StdStorage, stdStorage} from "forge-std/StdStorage.sol";

contract PioneerTest is TestUtils {
  using stdStorage for StdStorage;

  StdStorage private stdstore;

  address internal bob;
  address internal alice;

  Pioneer private nft;

  uint256 internal constant INITIAL_CONTRACT_BALANCE = 5 ether;

  function setUp() public {
    bob = _randomAddress();
    alice = _randomAddress();

    nft = new Pioneer("Pioneer", "ZNE", "https://zioneer.io/");
    // insert eth into the Pioneer contract to be rewarded to zioneer NFT mintees
    (bool success, ) = address(nft).call{value: 5 ether}("");
    require(success, "failed to insert eth into zioneer contract");
  }

  // helper method that checks for array equality of addresses
  function assertEqArray(address[] memory a, address[] memory b) internal {
    assertEq(a.length, b.length);
    for (uint256 i = 0; i < a.length; i++) {
      assertEq(a[i], b[i]);
    }
  }

  function testMint() public {
    address _minter = _randomAddress();

    vm.prank(_minter);
    vm.expectRevert(Pioneer.NotAllowed.selector);
    nft.mintTo(bob);

    nft.setAllowed(_minter, true);
    nft.mintTo(bob);
    assertEq(nft.balanceOf(bob), 1);
  }

  function testMaxSupplyReached() public {
    uint256 slot = stdstore.target(address(nft)).sig("currentTokenId()").find();
    bytes32 loc = bytes32(slot);
    bytes32 mockedCurrentTokenId = bytes32(abi.encode(10000));
    vm.store(address(nft), loc, mockedCurrentTokenId);

    vm.expectRevert(Pioneer.MaxSupplyReached.selector);
    nft.mintTo(bob);
  }

  function testMintZeroAddress() public {
    vm.expectRevert(Pioneer.NotAllowed.selector);
    nft.mintTo(address(0));
  }

  /**
    ########################################
    TEST: RECEIVE ETH
    ########################################
  */

  function testReceiveEth() public {
    // first, the contract's balance is equal to INITIAL_CONTRACT_BALANCE = 5
    assertEq(address(nft).balance, INITIAL_CONTRACT_BALANCE);

    // then we send 1 eth to the contract
    (bool success, ) = address(nft).call{value: 1 ether}("");
    require(success, "failed to send eth to zioneer contract");

    // the contract's balance is now 6 eth
    assertEq(address(nft).balance, 6 ether);
  }

  /**
    ########################################
    TEST: WITHDRAW
    ########################################
  */

  function testWithdrawAtOnce() public {
    // first, the contract's balance is equal to INITIAL_CONTRACT_BALANCE = 5
    assertEq(address(nft).balance, INITIAL_CONTRACT_BALANCE);

    // alice's balance is 0
    assertEq(alice.balance, 0);

    // withdraw all ETH to alice
    nft.withdraw(alice);

    // alice's balance is 5 eth
    assertEq(alice.balance, 5 ether);

    // the contract's balance is 0 eth
    assertEq(address(nft).balance, 0);
  }

  function testUnauthorizedWithdrawal() public {
    vm.prank(bob);
    vm.expectRevert("Ownable: caller is not the owner");
    nft.withdraw(bob);
  }

  /**
    ########################################
    TEST: MINT REWARDS
    ########################################
  */

  function testMintRewarding() public {
    // first, bob's balance is 0
    assertEq(bob.balance, 0);

    // minting to bob

    nft.mintTo(bob);

    // bob's balance is 0.1 eth due to the rewarding
    assertEq(bob.balance, 0.1 ether);

    // plus he still has the nft
    assertEq(nft.balanceOf(bob), 1);
  }

  function testMintRewardingMultiple() public {
    // first, bob's balance is 0
    assertEq(bob.balance, 0);

    // minting to bob
    nft.mintTo(bob);

    // bob's balance is 0.3 eth due to the rewarding
    assertEq(bob.balance, 0.1 ether);

    // plus he still has the nft
    assertEq(nft.balanceOf(bob), 1);
  }

  function testRevertIfMintingMultiple() public {
    // first, bob's balance is 0
    assertEq(bob.balance, 0);

    // minting to bob
    nft.mintTo(bob);

    // bob's balance is 0.3 eth due to the rewarding
    assertEq(bob.balance, 0.1 ether);

    // plus he still has the nft
    assertEq(nft.balanceOf(bob), 1);

    // minting to bob again
    vm.expectRevert(Pioneer.AlreadyMinted.selector);
    nft.mintTo(bob);
  }

  function testMintRewardAfterSetMintReward() public {
    // first, bob's balance is 0
    assertEq(bob.balance, 0);

    nft.setMintReward(0.2 ether);
    nft.mintTo(bob);

    // bob's balance is 0.2 eth due to the rewarding
    assertEq(bob.balance, 0.2 ether);

    // plus he still has the nft
    assertEq(nft.balanceOf(bob), 1);
  }

  function testMintRewardAfterZeroMintReward() public {
    // first, bob's balance is 0
    assertEq(bob.balance, 0);

    nft.setMintReward(0 ether);
    nft.mintTo(bob);

    // bob's balance is unchanged after rewarding
    assertEq(bob.balance, 0);

    // plus he still has the nft
    assertEq(nft.balanceOf(bob), 1);
  }

  function testUnauthorizedSetMintReward() public {
    vm.prank(bob);
    vm.expectRevert("Ownable: caller is not the owner");
    nft.setMintReward(0.2 ether);
  }

  function testFailMintRecipientNotPayable() public {
    // first, create a non-payable contract
    ERC721 nonPayable = new ERC721("Not Payable", "NP");

    // minting to non-payable contract

    // this should fail because the recipient is not payable
    nft.mintTo(address(nonPayable));
  }

  /**
    ########################################
    TEST: SET ALLOWED
    ########################################
  */

  function testSetAllowedInitialState() public {
    assertEq(nft.allowed(address(this)), true);
  }

  function testSetAllowedOneAddress() public {
    assertEq(nft.allowed(address(this)), true);
  }

  function testSetAllowedAddSameAddressTwice() public {
    assertEq(nft.allowed(address(this)), true);
  }

  function testSetAllowedAddThenRemove() public {
    nft.setAllowed(address(this), false);
    assertEq(nft.allowed(address(this)), false);
  }

  function testSetAllowedAddMultiple() public {
    nft.setAllowed(address(alice), true);
    nft.setAllowed(address(bob), true);

    assertEq(nft.allowed(address(alice)), true);
    assertEq(nft.allowed(address(bob)), true);
  }
}
