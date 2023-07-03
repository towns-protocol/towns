// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces

//libraries

//contracts
import {TokenPausable} from "contracts/src/diamond/extensions/pausable/token/TokenPausable.sol";
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";

contract TokenPausableTest is TestUtils {
  MockTokenPausable internal pausable;
  MockERC721 internal mockERC721;

  address internal deployer;
  address internal owner;

  function setUp() public {
    deployer = _randomAddress();
    owner = _randomAddress();

    vm.startPrank(deployer);
    mockERC721 = new MockERC721();
    pausable = new MockTokenPausable();

    uint256 tokenId = mockERC721.mintTo(owner);
    pausable.init(address(mockERC721), tokenId);
    vm.stopPrank();

    vm.startPrank(owner);
  }

  function test_pause() public {
    assertFalse(pausable.paused());

    pausable.pause();

    assertTrue(pausable.paused());
  }

  function test_unpause() public {
    pausable.pause();

    assertTrue(pausable.paused());

    pausable.unpause();

    assertFalse(pausable.paused());
  }

  function test_paused() public {
    assertFalse(pausable.paused());

    pausable.pause();

    assertTrue(pausable.paused());

    pausable.unpause();

    assertFalse(pausable.paused());
  }
}

contract MockTokenPausable is TokenPausable {
  function init(address collection, uint256 tokenId) external {
    __Ownable_init(collection, tokenId);
  }
}
