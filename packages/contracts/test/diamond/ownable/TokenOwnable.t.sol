// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces

//libraries

//contracts
import {TokenOwnableController} from "contracts/src/diamond/facets/ownable/token/TokenOwnableController.sol";
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";

contract TokenOwnableTest is TestUtils {
  MockTokenOwnable internal ownable;
  MockERC721 internal mockERC721;

  address internal deployer;
  address internal owner;

  function setUp() public {
    deployer = _randomAddress();
    owner = _randomAddress();

    vm.startPrank(deployer);
    mockERC721 = new MockERC721();
    ownable = new MockTokenOwnable();
  }

  function test_TokenOwnableUpgradeable_init() external {
    uint256 tokenId = mockERC721.mintTo(owner);
    ownable.init(address(mockERC721), tokenId);
    assertEq(ownable.owner(), owner);
  }
}

contract MockTokenOwnable is TokenOwnableController {
  function init(address collection, uint256 tokenId) external {
    __Ownable_init(collection, tokenId);
  }

  function owner() external view returns (address) {
    return _owner();
  }

  function transferOwnership(address newOwner) external {
    _transferOwnership(newOwner);
  }
}
