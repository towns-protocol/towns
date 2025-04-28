// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC721AQueryable} from "src/diamond/facets/token/ERC721A/extensions/IERC721AQueryable.sol";
import {IMembership} from "src/spaces/facets/membership/IMembership.sol";

// libraries

// contracts
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {SubscriptionApp} from "src/modules/apps/subscription/SubscriptionApp.sol";
import {DeploySubscriptionApp} from "scripts/deployments/utils/DeploySubscriptionApp.s.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract SubscriptionAppTest is BaseSetup {
    address developer;
    address bot;
    address alice;

    SubscriptionApp app;
    IMembership membership;
    IERC721AQueryable queryable;
    DeploySubscriptionApp deployHelper = new DeploySubscriptionApp();

    function setUp() public override {
        super.setUp();
        developer = _randomAddress();
        alice = _randomAddress();
        bot = _randomAddress();
        app = SubscriptionApp(payable(deployHelper.deploy(developer)));
        membership = IMembership(everyoneSpace);
        queryable = IERC721AQueryable(everyoneSpace);

        vm.label(address(app), "SubscriptionApp");
    }

    function _mintMembership(address user) internal {
        vm.prank(user);
        membership.joinSpace(user);
    }

    function test_getOwner() external view {
        assertEq(app.owner(), developer);
    }

    function test_full_flow() external {
        _mintMembership(alice);
        uint256 tokenId = queryable.tokensOfOwner(alice)[0];

        vm.prank(alice);
        app.subscribe(everyoneSpace, tokenId);

        uint256 renewalPrice = membership.getMembershipRenewalPrice(tokenId);
        uint256 expiresAt = membership.expiresAt(tokenId);
        uint256 feeBps = app.getFeeBps();
        uint256 fee = (renewalPrice * feeBps) / 10000;

        vm.deal(alice, renewalPrice + fee);
        vm.prank(alice);
        app.deposit{value: renewalPrice + fee}();

        vm.warp(expiresAt);

        vm.prank(bot);
        app.renew(everyoneSpace, tokenId, alice);

        assertEq(app.owner().balance, fee);
    }
}
