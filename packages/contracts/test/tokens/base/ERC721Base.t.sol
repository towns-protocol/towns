// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {ERC721Base} from "contracts/src/tokens/base/ERC721Base.sol";
import {IERC721A} from "ERC721A/IERC721A.sol";

contract ERC721BaseTest is TestUtils {
  using Strings for uint256;

  string internal constant NAME = "Test";
  string internal constant SYMBOL = "TST";
  address internal royaltyReceiver;
  uint256 internal royaltyAmount;

  ERC721Base internal erc721Base;
  address internal deployer;

  function setUp() external {
    deployer = _randomAddress();
    royaltyReceiver = _randomAddress();
    royaltyAmount = 500; // 5%

    vm.prank(deployer);
    erc721Base = new ERC721Base(NAME, SYMBOL, royaltyReceiver, royaltyAmount);
  }

  function test_mintTo() public {
    address receiver = _randomAddress();
    string memory _tokenURI = "tokenURI";

    uint256 nextTokenId = erc721Base.nextTokenId();
    uint256 totalSupply = erc721Base.totalSupply();
    uint256 receiverBalance = erc721Base.balanceOf(receiver);

    vm.prank(deployer);
    erc721Base.mintTo(receiver, _tokenURI);

    assertEq(erc721Base.nextTokenId(), nextTokenId + 1);
    assertEq(erc721Base.tokenURI(nextTokenId), _tokenURI);
    assertEq(erc721Base.totalSupply(), totalSupply + 1);
    assertEq(erc721Base.balanceOf(receiver), receiverBalance + 1);
    assertEq(erc721Base.ownerOf(nextTokenId), receiver);
  }

  function test_revertMintNotAuthorized() public {
    address receiver = _randomAddress();
    string memory _tokenURI = "tokenURI";

    vm.expectRevert("ERC721Base: caller cannot mint");
    vm.prank(receiver);
    erc721Base.mintTo(receiver, _tokenURI);
  }

  function test_revertMintToZeroAddress() public {
    address receiver = address(0);
    string memory _tokenURI = "tokenURI";

    vm.expectRevert(IERC721A.MintToZeroAddress.selector);
    vm.prank(deployer);
    erc721Base.mintTo(receiver, _tokenURI);
  }

  // batch mint

  function test_batchMintTo() public {
    address receiver = _randomAddress();
    uint256 _quantity = 100;
    string memory _tokenURI = "tokenURI";

    uint256 nextTokenId = erc721Base.nextTokenId();
    uint256 totalSupply = erc721Base.totalSupply();
    uint256 receiverBalance = erc721Base.balanceOf(receiver);

    vm.prank(deployer);
    erc721Base.batchMintTo(receiver, _quantity, _tokenURI, "");

    assertEq(erc721Base.nextTokenId(), nextTokenId + _quantity);
    assertEq(erc721Base.totalSupply(), totalSupply + _quantity);
    assertEq(erc721Base.balanceOf(receiver), receiverBalance + _quantity);
    for (uint256 i = nextTokenId; i < _quantity; i += 1) {
      assertEq(
        erc721Base.tokenURI(i),
        string(abi.encodePacked(_tokenURI, i.toString()))
      );
      assertEq(erc721Base.ownerOf(i), receiver);
    }
  }

  function test_revertBatchMintToNotAuthorized() public {
    uint256 _quantity = 100;
    string memory _tokenURI = "tokenURI";

    vm.expectRevert("ERC721Base: caller cannot mint");
    vm.prank(_randomAddress());
    erc721Base.batchMintTo(deployer, _quantity, _tokenURI, "");
  }

  function test_revertBatchMintToZeroAddress() public {
    uint256 _quantity = 100;
    string memory _tokenURI = "tokenURI";

    vm.expectRevert(IERC721A.MintToZeroAddress.selector);
    vm.prank(deployer);
    erc721Base.batchMintTo(address(0), _quantity, _tokenURI, "");
  }

  // burn
  function test_burn() public {
    address receiver = _randomAddress();
    string memory _tokenURI = "tokenURI";

    uint256 nextTokenId = erc721Base.nextTokenId();
    uint256 totalSupply = erc721Base.totalSupply();
    uint256 receiverBalance = erc721Base.balanceOf(receiver);

    vm.prank(deployer);
    erc721Base.mintTo(receiver, _tokenURI);

    vm.prank(receiver);
    erc721Base.burn(nextTokenId);

    assertEq(erc721Base.nextTokenId(), nextTokenId + 1);
    assertEq(erc721Base.tokenURI(nextTokenId), _tokenURI);
    assertEq(erc721Base.totalSupply(), totalSupply);
    assertEq(erc721Base.balanceOf(receiver), receiverBalance);

    vm.expectRevert(IERC721A.OwnerQueryForNonexistentToken.selector);
    assertEq(erc721Base.ownerOf(nextTokenId), address(0));
  }

  function test_burnApproved() public {
    address receiver = _randomAddress();
    address operator = _randomAddress();
    string memory _tokenURI = "tokenURI";

    uint256 nextTokenId = erc721Base.nextTokenId();
    uint256 totalSupply = erc721Base.totalSupply();
    uint256 receiverBalance = erc721Base.balanceOf(receiver);

    vm.prank(deployer);
    erc721Base.mintTo(receiver, _tokenURI);

    vm.prank(receiver);
    erc721Base.setApprovalForAll(operator, true);

    vm.prank(operator);
    erc721Base.burn(nextTokenId);

    assertEq(erc721Base.nextTokenId(), nextTokenId + 1);
    assertEq(erc721Base.tokenURI(nextTokenId), _tokenURI);
    assertEq(erc721Base.totalSupply(), totalSupply);
    assertEq(erc721Base.balanceOf(receiver), receiverBalance);

    vm.expectRevert(IERC721A.OwnerQueryForNonexistentToken.selector);
    assertEq(erc721Base.ownerOf(nextTokenId), address(0));
  }

  function test_revertBurnNotOwnerNotApproved() public {
    address receiver = _randomAddress();
    string memory _tokenURI = "tokenURI";

    uint256 nextTokenId = erc721Base.nextTokenId();

    vm.prank(deployer);
    erc721Base.mintTo(receiver, _tokenURI);

    vm.expectRevert(IERC721A.TransferCallerNotOwnerNorApproved.selector);
    vm.prank(_randomAddress());
    erc721Base.burn(nextTokenId);
  }

  // isApprovedOrOwner
  function test_isApprovedOrOwner() public {
    address receiver = _randomAddress();
    address operator = _randomAddress();
    string memory _tokenURI = "tokenURI";

    uint256 nextTokenId = erc721Base.nextTokenId();

    vm.prank(deployer);
    erc721Base.mintTo(receiver, _tokenURI);

    assertFalse(erc721Base.isApprovedOrOwner(operator, nextTokenId));
    assertTrue(erc721Base.isApprovedOrOwner(receiver, nextTokenId));

    vm.prank(receiver);
    erc721Base.approve(operator, nextTokenId);

    assertTrue(erc721Base.isApprovedOrOwner(operator, nextTokenId));
  }
}
