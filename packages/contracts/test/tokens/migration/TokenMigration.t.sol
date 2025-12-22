// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

//interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IPausableBase} from "@towns-protocol/diamond/src/facets/pausable/IPausable.sol";
import {ITokenMigrationBase} from "src/tokens/migration/ITokenMigration.sol";

//libraries
import {Validator} from "src/utils/libraries/Validator.sol";

//contracts
import {DeployRiverMigration} from "scripts/deployments/diamonds/DeployRiverMigration.s.sol";
import {MockERC20} from "test/mocks/MockERC20.sol";

// facets
import {PausableFacet} from "@towns-protocol/diamond/src/facets/pausable/PausableFacet.sol";
import {TokenMigrationFacet} from "src/tokens/migration/TokenMigrationFacet.sol";

contract TokenMigrationTest is TestUtils, IPausableBase, ITokenMigrationBase, IOwnableBase {
    DeployRiverMigration internal riverMigrationHelper;
    MockERC20 internal oldToken;
    MockERC20 internal newToken;

    TokenMigrationFacet internal tokenMigration;
    PausableFacet internal pausable;

    address internal deployer;
    address internal diamond;

    function setUp() external {
        deployer = getDeployer();

        riverMigrationHelper = new DeployRiverMigration();
        oldToken = new MockERC20("Old Token", "OLD", 18);
        newToken = new MockERC20("New Token", "NEW", 18);

        vm.label(address(oldToken), "Old Token");
        vm.label(address(newToken), "New Token");

        riverMigrationHelper.setTokens(address(oldToken), address(newToken));
        diamond = riverMigrationHelper.deploy(deployer);

        tokenMigration = TokenMigrationFacet(diamond);
        pausable = PausableFacet(diamond);
    }

    // modifiers
    modifier givenAccountHasOldTokens(address account, uint256 amount) {
        vm.assume(amount > 0);
        vm.prank(deployer);
        oldToken.mint(account, amount);
        _;
    }

    modifier givenContractHasNewTokens(uint256 amount) {
        vm.prank(deployer);
        newToken.mint(address(tokenMigration), amount);
        _;
    }

    modifier givenContractIsUnpaused() {
        vm.prank(deployer);
        pausable.unpause();
        _;
    }

    modifier givenAllowanceIsSet(address account, uint256 amount) {
        vm.prank(account);
        oldToken.approve(address(tokenMigration), amount);
        _;
    }

    modifier givenAccountMigrated(address account, uint256 amount) {
        vm.prank(account);
        vm.expectEmit(address(tokenMigration));
        emit TokensMigrated(account, amount);
        tokenMigration.migrate(account);
        _;
    }

    // tests
    function testFuzz_migrate(
        address account,
        uint256 amount
    )
        external
        assumeEOA(account)
        givenContractIsUnpaused
        givenAccountHasOldTokens(account, amount)
        givenAllowanceIsSet(account, amount)
        givenContractHasNewTokens(amount)
        givenAccountMigrated(account, amount)
    {
        assertEq(oldToken.balanceOf(account), 0);
        assertEq(newToken.balanceOf(account), amount);
    }

    function test_revertWhen_migrationPaused() external {
        vm.prank(deployer);
        vm.expectRevert(Pausable__Paused.selector);
        tokenMigration.migrate(address(0));
    }

    function test_revertWhen_addressIsZero() external givenContractIsUnpaused {
        vm.expectRevert(Validator.InvalidAddress.selector);
        tokenMigration.migrate(address(0));
    }

    function test_revertWhen_balanceIsZero(
        address account
    ) external givenContractIsUnpaused assumeEOA(account) {
        vm.expectRevert(TokenMigration__InvalidBalance.selector);
        tokenMigration.migrate(account);
    }

    function test_revertWhen_invalidAllowance(
        address account,
        uint256 amount
    )
        external
        givenContractIsUnpaused
        assumeEOA(account)
        givenAccountHasOldTokens(account, amount)
    {
        vm.expectRevert(TokenMigration__InvalidAllowance.selector);
        tokenMigration.migrate(account);
    }

    // emergencyWithdraw
    function testFuzz_emergencyWithdraw(
        address account,
        uint256 amount
    )
        external
        assumeEOA(account)
        givenContractIsUnpaused
        givenAccountHasOldTokens(account, amount)
        givenContractHasNewTokens(amount)
        givenAllowanceIsSet(account, amount)
        givenAccountMigrated(account, amount)
    {
        vm.startPrank(deployer);
        pausable.pause();
        tokenMigration.emergencyWithdraw(IERC20(address(oldToken)), deployer);
        tokenMigration.emergencyWithdraw(IERC20(address(newToken)), deployer);
        vm.stopPrank();

        assertEq(oldToken.balanceOf(address(tokenMigration)), 0);
        assertEq(newToken.balanceOf(address(tokenMigration)), 0);
        assertEq(oldToken.balanceOf(address(deployer)), amount);
        assertEq(newToken.balanceOf(address(account)), amount);
    }

    function test_revertWhen_withdrawTokensNotOwner() external {
        address randomAddress = _randomAddress();

        vm.prank(randomAddress);
        vm.expectRevert(
            abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, randomAddress)
        );
        tokenMigration.emergencyWithdraw(IERC20(address(oldToken)), deployer);
    }
}
