// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "../../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {ISwapRouterBase} from "../../../src/router/ISwapRouter.sol";

// libraries
import {BasisPoints} from "../../../src/utils/libraries/BasisPoints.sol";

// contracts
import {DeployMockERC20, MockERC20} from "../../../scripts/deployments/utils/DeployMockERC20.s.sol";
import {SwapRouter} from "../../../src/router/SwapRouter.sol";
import {MembershipFacet} from "../../../src/spaces/facets/membership/MembershipFacet.sol";
import {MockRouter} from "../../mocks/MockRouter.sol";

// helpers
import {DeploySwapRouter} from "../../../scripts/deployments/diamonds/DeploySwapRouter.s.sol";
import {BaseSetup} from "../BaseSetup.sol";

contract SwapFacetTest is BaseSetup, ISwapRouterBase {
    MembershipFacet internal membership;
    MockERC20 internal token0;
    MockERC20 internal token1;
    address internal feeRecipient;
    SwapRouter internal swapRouter;
    address internal mockRouter;
    address internal poster = makeAddr("poster");
    uint16 internal constant TREASURY_BPS = 50; // 0.5%
    uint16 internal constant POSTER_BPS = 50; // 0.5%

    function setUp() public override {
        super.setUp();

        DeployMockERC20 deployERC20 = new DeployMockERC20();
        token0 = MockERC20(deployERC20.deploy(deployer));
        token1 = MockERC20(deployERC20.deploy(deployer));
        membership = MembershipFacet(everyoneSpace);
        feeRecipient = IPlatformRequirements(spaceFactory).getFeeRecipient();

        // deploy mock router and whitelist it
        mockRouter = address(new MockRouter());
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setRouterWhitelisted(mockRouter, true);

        // set swap fees
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(TREASURY_BPS, POSTER_BPS);

        // deploy and initialize SwapRouter
        DeploySwapRouter deploySwapRouter = new DeploySwapRouter();
        deploySwapRouter.setDependencies(spaceFactory);
        swapRouter = SwapRouter(deploySwapRouter.deploy(deployer));
    }
}
