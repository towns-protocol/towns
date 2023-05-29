// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import "contracts/test/utils/TestUtils.sol";
import {MerkleTree} from "contracts/test/utils/MerkleTree.sol";
import {IERC721Receiver} from "openzeppelin-contracts/contracts/token/ERC721/IERC721Receiver.sol";
import {Member} from "contracts/src/tokens/Member.sol";
import {IMember} from "contracts/src/tokens/interfaces/IMember.sol";

contract MemberTest is TestUtils {
  using stdStorage for StdStorage;

  Member private nft;
  MerkleTree private merkle;

  uint256 private NFT_PRICE = 0.08 ether;
  uint256 private NFT_SUPPLY = 2500;

  bytes32[][] private treeData;

  address[] accounts;
  uint256[] allowances;

  function setUp() public {
    //generate a merkle root from the allowlisted users test data
    (accounts, allowances) = _mockWhitelist(10);

    merkle = new MerkleTree();
    (bytes32 root, bytes32[][] memory tree) = merkle.constructTree(
      accounts,
      allowances
    );
    treeData = tree;

    //deploy the nft
    nft = new Member("Member", "MBR", "baseUri", root);
  }

  /// if public minting has not started, normal mints should fail
  function testFailPublicMintingNotOpen() public {
    nft.publicMint(_randomAddress());
  }

  /// if no eth is sent, the mint should fail
  function testFailNoMintPricePaid() public {
    nft.startWaitlistMint();
    nft.startPublicMint();
    nft.publicMint(_randomAddress());
  }

  /// if wrong eth is sent, the mint should fail
  function testFailWrongMintPricePaid() public {
    nft.startWaitlistMint();
    nft.startPublicMint();
    nft.publicMint{value: 5 ether}(_randomAddress());
  }

  /// if public minting is opened and the correct amount is sent, the mint should succeed
  function testMintPricePaid() public {
    nft.startWaitlistMint();
    nft.startPublicMint();
    nft.publicMint{value: NFT_PRICE}(_randomAddress());
  }

  /// if a user mints an nft, the uri should exist for that token id
  function testUriMatches() public {
    nft.startWaitlistMint();
    nft.startPublicMint();
    nft.publicMint{value: NFT_PRICE}(_randomAddress());
    assertEq(
      nft.tokenURI(0),
      string(abi.encodePacked("baseUri", "councilmetadata"))
    );
  }

  /// if user is waitlisted only (allowance = 0), minting should fail if in allowlist minting period
  function testRevertAllowlistMintOnlyWaitlisted() public {
    uint256 position = _findAllowancePosition(0);
    address account = accounts[position];
    uint256 allowance = allowances[position];

    bytes32[] memory proof = merkle.getProof(treeData, position);

    vm.expectRevert(IMember.NotAllowed.selector);
    nft.privateMint{value: NFT_PRICE}(account, allowance, proof);
  }

  /// if the proof generation is invalid, the test should fail
  function testRevertAllowlistMintBadProof() public {
    uint256 position = _randomUint256();
    uint256 allowance = 1;

    bytes32[] memory proof = merkle.getProof(treeData, position);

    vm.expectRevert(IMember.InvalidProof.selector);
    nft.privateMint{value: NFT_PRICE}(_randomAddress(), allowance, proof);
  }

  /// if the minting period is in the waitlist, waitlisted users should be able to mint
  function testWaitlistMintWaitlisted() public {
    nft.startWaitlistMint();

    uint256 position = _findAllowancePosition(0);
    address account = accounts[position];
    uint256 allowance = allowances[position];

    bytes32[] memory proof = merkle.getProof(treeData, position);
    nft.privateMint{value: NFT_PRICE}(account, allowance, proof);
  }

  //if the minting period is in the waitlist, allowlisted users should *still* be able to mint
  function testWaitlistMintAllowlisted() public {
    nft.startWaitlistMint();

    uint256 position = _findAllowancePosition(1);
    address account = accounts[position];
    uint256 allowance = allowances[position];

    bytes32[] memory proof = merkle.getProof(treeData, position);
    nft.privateMint{value: NFT_PRICE}(account, allowance, proof);
  }

  /// if the user is on the allowlist, they should be able to mint immediately
  function testAllowlistMint() public {
    uint256 position = _findAllowancePosition(1);
    address account = accounts[position];
    uint256 allowance = allowances[position];

    bytes32[] memory proof = merkle.getProof(treeData, position);
    nft.privateMint{value: NFT_PRICE}(account, allowance, proof);
  }

  /// if the total supply has been minted, further mints should fail
  function testRevertMaxSupplyReached() public {
    uint256 slot = stdstore.target(address(nft)).sig("currentTokenId()").find();
    bytes32 loc = bytes32(slot);
    bytes32 mockedCurrentTokenId = bytes32(abi.encode(NFT_SUPPLY));
    vm.store(address(nft), loc, mockedCurrentTokenId);

    nft.startWaitlistMint();
    nft.startPublicMint();

    vm.expectRevert(IMember.MaxSupplyReached.selector);
    nft.publicMint{value: NFT_PRICE}(_randomAddress());
  }

  //if trying to mint to the zero address, minting should fail
  function testFailMintToZeroAddress() public {
    nft.startWaitlistMint();
    nft.startPublicMint();
    nft.publicMint{value: NFT_PRICE}(address(0));
  }

  //if a user successfully mints, verify that they become the owner of the nft
  function testNewMintOwnerRegistered() public {
    nft.startWaitlistMint();
    nft.startPublicMint();
    nft.publicMint{value: NFT_PRICE}(address(2));
    nft.publicMint{value: NFT_PRICE}(address(1));

    uint256 slotOfNewOwner = stdstore
      .target(address(nft))
      .sig(nft.ownerOf.selector)
      .with_key(1)
      .find();

    uint160 ownerOfTokenIdOne = uint160(
      uint256((vm.load(address(nft), bytes32(abi.encode(slotOfNewOwner)))))
    );

    assertEq(address(ownerOfTokenIdOne), address(1));
  }

  /// if a user mints, they should not be able to mint again
  function testRevertSecondMint() public {
    nft.startWaitlistMint();
    nft.startPublicMint();

    nft.publicMint{value: NFT_PRICE}(address(1));

    uint256 slotBalance = stdstore
      .target(address(nft))
      .sig(nft.balanceOf.selector)
      .with_key(address(1))
      .find();

    uint256 balanceFirstMint = uint256(
      vm.load(address(nft), bytes32(slotBalance))
    );
    assertEq(balanceFirstMint, 1);

    //This should fail
    vm.expectRevert(IMember.AlreadyMinted.selector);
    nft.publicMint{value: NFT_PRICE}(address(1));
  }

  /// if a contract implements the erc721received function, it should be able to be minted to
  function testSafeContractReceiver() public {
    nft.startWaitlistMint();
    nft.startPublicMint();

    Receiver receiver = new Receiver();
    nft.publicMint{value: NFT_PRICE}(address(receiver));
    uint256 slotBalance = stdstore
      .target(address(nft))
      .sig(nft.balanceOf.selector)
      .with_key(address(receiver))
      .find();

    uint256 balance = uint256(vm.load(address(nft), bytes32(slotBalance)));
    assertEq(balance, 1);
  }

  /// contracts should not be able to receive this NFT if they dont implement erc721 received
  function testFailUnSafeContractReceiver() public {
    nft.startWaitlistMint();
    nft.startPublicMint();

    vm.etch(address(1), bytes("mock code"));
    nft.publicMint{value: NFT_PRICE}(address(1));
  }

  /// if there is a balance, the owner should be able to withdraw it
  function testWithdrawalWorksAsOwner() public {
    nft.startWaitlistMint();
    nft.startPublicMint();

    // Mint an NFT, sending eth to the contract
    Receiver receiver = new Receiver();
    address payable payee = payable(address(0x55));
    uint256 priorPayeeBalance = payee.balance;
    nft.publicMint{value: NFT_PRICE}(address(receiver));

    // Check that the balance of the contract is correct
    assertEq(address(nft).balance, NFT_PRICE);
    uint256 nftBalance = address(nft).balance;

    // Withdraw the balance and assert it was transferred
    nft.withdrawPayments(payee);
    assertEq(payee.balance, priorPayeeBalance + nftBalance);
  }

  /// if there is a balance, a non-owner should not be able to withdraw from it
  function testWithdrawalFailsAsNotOwner() public {
    nft.startWaitlistMint();
    nft.startPublicMint();

    // Mint an NFT, sending eth to the contract
    Receiver receiver = new Receiver();
    nft.publicMint{value: NFT_PRICE}(address(receiver));
    // Check that the balance of the contract is correct
    assertEq(address(nft).balance, NFT_PRICE);

    // Confirm that a non-owner cannot withdraw
    vm.expectRevert("Ownable: caller is not the owner");
    vm.prank(address(0x55));
    nft.withdrawPayments(payable(address(0x55)));
  }

  // =============================================================
  //                          INTERNAL
  // =============================================================

  function _findAllowancePosition(
    uint256 allowanceType
  ) internal view returns (uint256) {
    uint256 position = 0;
    for (uint256 i = 0; i < allowances.length; i++) {
      if (allowances[i] == allowanceType) {
        position = i;
        break;
      }
    }
    return position;
  }

  function _mockWhitelist(
    uint256 amount
  ) internal view returns (address[] memory, uint256[] memory) {
    address[] memory _addresses = new address[](amount);
    uint256[] memory _allowances = new uint256[](amount);

    for (uint256 i = 0; i < amount; i++) {
      _addresses[i] = _randomAddress();
      _allowances[i] = _randomUint256() % 2;
    }

    return (_addresses, _allowances);
  }
}

/// a contract that can be used to test the erc721 received function
contract Receiver is IERC721Receiver {
  function onERC721Received(
    address,
    address,
    uint256,
    bytes calldata
  ) external pure override returns (bytes4) {
    return this.onERC721Received.selector;
  }
}
