// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {Test} from "forge-std/Test.sol";
import {BaseSetup} from "../../spaces/BaseSetup.sol";
import {ERC6900Setup} from "../../account/ERC6900Setup.sol";
import {BasisPoints} from "../../../src/utils/libraries/BasisPoints.sol";

// interfaces
import {IMembership} from "../../../src/spaces/facets/membership/IMembership.sol";
import {IArchitectBase} from "../../../src/factory/facets/architect/IArchitect.sol";
import {ICreateSpace} from "src/factory/facets/create/ICreateSpace.sol";
import {IERC721AQueryable} from "src/diamond/facets/token/ERC721A/extensions/IERC721AQueryable.sol";
import {IModularAccount} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";
import {ISubscriptionModuleBase} from "../../../src/apps/modules/subscription/ISubscriptionModule.sol";
import {IPlatformRequirements} from "../../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IFeeManager} from "../../../src/factory/facets/fee/IFeeManager.sol";
import {FeeCalculationMethod} from "../../../src/factory/facets/fee/FeeManagerStorage.sol";
import {FeeTypesLib} from "../../../src/factory/facets/fee/FeeTypesLib.sol";
import {MockERC20} from "../../mocks/MockERC20.sol";

// types
import {Subscription} from "../../../src/apps/modules/subscription/SubscriptionModuleStorage.sol";

// libraries
import {ValidationConfigLib, ValidationConfig} from "@erc6900/reference-implementation/libraries/ValidationConfigLib.sol";
import {ModuleEntityLib, ModuleEntity} from "@erc6900/reference-implementation/libraries/ModuleEntityLib.sol";
import {ModuleInstallCommonsLib} from "modular-account/src/libraries/ModuleInstallCommonsLib.sol";

// contracts
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";

// modules
import {DeploySubscriptionModule} from "../../../scripts/deployments/diamonds/DeploySubscriptionModule.s.sol";
import {SubscriptionModuleFacet} from "../../../src/apps/modules/subscription/SubscriptionModuleFacet.sol";

contract ModulesBase is Test, BaseSetup, ERC6900Setup, ISubscriptionModuleBase {
    SubscriptionModuleFacet subscriptionModule;
    IPlatformRequirements platformRequirements;
    DeploySubscriptionModule deploySubscriptionModule;

    address owner = makeAddr("owner");
    address processor = makeAddr("processor");

    uint64 DEFAULT_MEMBERSHIP_DURATION = 365 days;
    uint256 DEFAULT_MEMBERSHIP_PRICE = 1 ether;

    // USDC
    MockERC20 mockUSDC;
    uint256 constant DEFAULT_USDC_PRICE = 10_000_000; // $10 USDC (6 decimals)
    uint16 constant USDC_FEE_BPS = 1000; // 10%
    uint128 constant USDC_MIN_FEE = 1_500_000; // $1.50 minimum (6 decimals)

    function setUp() public virtual override(BaseSetup, ERC6900Setup) {
        super.setUp();

        deploySubscriptionModule = new DeploySubscriptionModule();

        platformRequirements = IPlatformRequirements(spaceFactory);
        subscriptionModule = SubscriptionModuleFacet(deploySubscriptionModule.deploy(deployer));

        // Deploy mock USDC and configure fee
        mockUSDC = new MockERC20("USD Coin", "USDC", 6);
        vm.prank(deployer);
        IFeeManager(spaceFactory).setFeeConfig(
            FeeTypesLib.membership(address(mockUSDC)),
            deployer,
            FeeCalculationMethod.HYBRID,
            USDC_FEE_BPS,
            USDC_MIN_FEE,
            true
        );

        vm.startPrank(deployer);
        subscriptionModule.grantOperator(processor);
        subscriptionModule.setSpaceFactory(spaceFactory);
        vm.stopPrank();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   MEMBERSHIP HELPERS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createSpace(uint256 price, uint64 duration) internal returns (address) {
        return _createSpaceWithCurrency(price, duration, address(0));
    }

    function _createSpaceUSDC(uint256 price, uint64 duration) internal returns (address) {
        return _createSpaceWithCurrency(price, duration, address(mockUSDC));
    }

    function _createSpaceWithCurrency(
        uint256 price,
        uint64 duration,
        address currency
    ) internal returns (address space) {
        IArchitectBase.SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo("ModulesSpace");
        spaceInfo.membership.settings.freeAllocation = 0;
        spaceInfo.membership.settings.currency = currency;

        if (price > 0) {
            spaceInfo.membership.settings.pricingModule = fixedPricingModule;
            spaceInfo.membership.settings.price = price;
        } else {
            spaceInfo.membership.settings.pricingModule = pricingModule;
        }

        if (duration > 0) spaceInfo.membership.settings.duration = duration;

        vm.prank(owner);
        space = ICreateSpace(spaceFactory).createSpace(spaceInfo);
    }

    function _joinSpace(address account, address space) internal returns (uint256 tokenId) {
        IMembership membership = _getMembership(space);
        uint256 price = membership.getMembershipPrice();

        hoax(account, price);
        membership.joinSpace{value: price}(account);
        tokenId = IERC721AQueryable(space).tokensOfOwner(account)[0];
    }

    function _joinSpaceUSDC(address account, address space) internal returns (uint256 tokenId) {
        IMembership membership = _getMembership(space);
        uint256 price = membership.getMembershipPrice();

        mockUSDC.mint(account, price);
        vm.prank(account);
        mockUSDC.approve(space, price);
        vm.prank(account);
        membership.joinSpace(account);
        tokenId = IERC721AQueryable(space).tokensOfOwner(account)[0];
    }

    function _setMembershipPrice(address space, uint256 price) internal {
        vm.prank(address(owner));
        _getMembership(space).setMembershipPrice(price);
    }

    function _setMembershipDuration(address space, uint64 duration) internal {
        vm.prank(address(owner));
        _getMembership(space).setMembershipDuration(duration);
    }

    function _renewMembership(address space, address account, uint256 tokenId) internal {
        uint256 renewalPrice = _getMembership(space).getMembershipRenewalPrice(tokenId);
        hoax(account, renewalPrice);
        _getMembership(space).renewMembership{value: renewalPrice}(tokenId);
    }

    function _renewMembershipUSDC(address space, address account, uint256 tokenId) internal {
        uint256 renewalPrice = _getMembership(space).getMembershipRenewalPrice(tokenId);
        mockUSDC.mint(account, renewalPrice);
        vm.prank(account);
        mockUSDC.approve(space, renewalPrice);
        vm.prank(account);
        _getMembership(space).renewMembership(tokenId);
    }

    function _getMembership(address space) internal pure returns (IMembership) {
        return IMembership(space);
    }

    function _transferMembership(
        address space,
        address account,
        address newAccount,
        uint256 tokenId
    ) internal {
        vm.prank(address(account));
        IERC721(space).transferFrom(account, newAccount, tokenId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 SUBSCRIPTION HELPERS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    struct SubscriptionParams {
        address account;
        address space;
        uint256 tokenId;
        uint256 renewalPrice;
        uint256 expirationTime;
        uint32 entityId;
        uint64 nextRenewalTime;
    }

    function _createSubscriptionParams(
        address account,
        address space,
        uint256 tokenId
    ) internal view returns (SubscriptionParams memory params) {
        IMembership membershipFacet = IMembership(space);

        uint256 expirationTime = membershipFacet.expiresAt(tokenId);
        uint256 duration = membershipFacet.getMembershipDuration();
        uint256 buf = subscriptionModule.getRenewalBuffer(duration);
        uint64 nextRenewalTime;

        if (expirationTime > buf) {
            nextRenewalTime = uint64(expirationTime - buf);
        } else {
            nextRenewalTime = uint64(block.timestamp);
        }

        uint256 renewalPrice = membershipFacet.getMembershipRenewalPrice(tokenId);

        return
            SubscriptionParams({
                account: account,
                space: space,
                tokenId: tokenId,
                renewalPrice: renewalPrice,
                expirationTime: expirationTime,
                entityId: nextEntityId,
                nextRenewalTime: nextRenewalTime
            });
    }

    function _installSubscriptionModule(
        ModularAccount account,
        SubscriptionParams memory params
    ) internal returns (uint32 entityId) {
        ValidationConfig validationConfig = ValidationConfigLib.pack(
            address(subscriptionModule),
            params.entityId,
            false,
            false,
            false
        );

        // Include both execute and executeBatch for ERC20 renewal support
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = IModularAccount.execute.selector;
        selectors[1] = IModularAccount.executeBatch.selector;

        bytes[] memory hooks = new bytes[](0);

        bytes memory installData = abi.encode(params.entityId, params.space, params.tokenId);

        vm.prank(address(entryPoint));
        account.installValidation(validationConfig, selectors, installData, hooks);

        return params.entityId;
    }

    function _uninstallSubscriptionModule(ModularAccount account, uint32 entityId) internal {
        ModuleEntity moduleEntity = ModuleEntityLib.pack(address(subscriptionModule), entityId);

        bytes[] memory hooks = new bytes[](0);

        bytes memory uninstallData = abi.encode(entityId);

        vm.prank(address(entryPoint));
        account.uninstallValidation(moduleEntity, uninstallData, hooks);
    }

    function _createSubscription(
        address user,
        uint64 duration,
        uint256 price
    )
        internal
        returns (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        )
    {
        return _createSubscriptionWithCurrency(user, duration, price, address(0));
    }

    function _createSubscription(
        address user
    )
        internal
        returns (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        )
    {
        return _createSubscription(user, DEFAULT_MEMBERSHIP_DURATION, DEFAULT_MEMBERSHIP_PRICE);
    }

    function _createSubscriptionUSDC(
        address user,
        uint64 duration,
        uint256 price
    )
        internal
        returns (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        )
    {
        return _createSubscriptionWithCurrency(user, duration, price, address(mockUSDC));
    }

    function _createSubscriptionWithCurrency(
        address user,
        uint64 duration,
        uint256 price,
        address currency
    )
        internal
        returns (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        )
    {
        account = _createAccount(user, 0);
        address space = _createSpaceWithCurrency(price, duration, currency);
        tokenId = currency == address(0)
            ? _joinSpace(address(account), space)
            : _joinSpaceUSDC(address(account), space);
        params = _createSubscriptionParams(address(account), space, tokenId);
        entityId = _installSubscriptionModule(account, params);
        ++nextEntityId;

        return (account, tokenId, entityId, params);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    RENEWAL HELPERS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _processRenewalAs(address caller, address account, uint32 entityId) internal {
        RenewalParams[] memory renewalParams = new RenewalParams[](1);
        renewalParams[0] = RenewalParams({account: account, entityId: entityId});

        vm.prank(caller);
        subscriptionModule.batchProcessRenewals(renewalParams);
        delete renewalParams;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       TIME HELPERS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _warpToRenewalTime(address space, uint256 tokenId) internal {
        uint256 expiresAt = _getMembership(space).expiresAt(tokenId);
        uint256 duration = _getMembership(space).getMembershipDuration();
        vm.warp(expiresAt - subscriptionModule.getRenewalBuffer(duration));
    }

    function _warpToGracePeriod(address space, uint256 tokenId) internal {
        uint256 expiresAt = _getMembership(space).expiresAt(tokenId);
        uint256 duration = _getMembership(space).getMembershipDuration();
        uint256 renewalTime = expiresAt - subscriptionModule.getRenewalBuffer(duration);
        vm.warp(renewalTime + subscriptionModule.GRACE_PERIOD() - 1);
    }

    function _warpPastGracePeriod(address space, uint256 tokenId) internal {
        uint256 expiresAt = _getMembership(space).expiresAt(tokenId);
        uint256 duration = _getMembership(space).getMembershipDuration();
        uint256 renewalTime = expiresAt - subscriptionModule.getRenewalBuffer(duration);
        vm.warp(renewalTime + subscriptionModule.GRACE_PERIOD() + 1);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     ASSERTION HELPERS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    struct BalanceSnapshot {
        uint256 account;
        uint256 space;
        uint256 feeRecipient;
    }

    function snapshotBalances(
        address account,
        address space,
        address feeRecipient
    ) internal view returns (BalanceSnapshot memory b) {
        b.account = address(account).balance;
        b.space = address(space).balance;
        b.feeRecipient = feeRecipient.balance;
    }

    function snapshotBalancesUSDC(
        address account,
        address space,
        address feeRecipient
    ) internal view returns (BalanceSnapshot memory b) {
        b.account = mockUSDC.balanceOf(account);
        b.space = mockUSDC.balanceOf(space);
        b.feeRecipient = mockUSDC.balanceOf(feeRecipient);
    }

    function _calculateProtocolFee(uint256 basePrice) internal view returns (uint256) {
        uint256 protocolFee = platformRequirements.getMembershipFee(); // Min fee for 1 ether
        uint256 bpsFee = BasisPoints.calculate(basePrice, platformRequirements.getMembershipBps());
        if (bpsFee > protocolFee) return bpsFee;
        return protocolFee;
    }

    function assertNativeDistribution(
        uint256 originalBasePrice,
        uint256 renewalPrice,
        BalanceSnapshot memory beforeSnap,
        BalanceSnapshot memory afterSnap
    ) internal view {
        // Verify payment distribution: account paid original renewal price
        uint256 paidAmount = beforeSnap.account - afterSnap.account;
        assertEq(paidAmount, renewalPrice, "Should pay original renewal price");

        uint256 expectedProtocolFee = _calculateProtocolFee(originalBasePrice);
        assertEq(
            afterSnap.feeRecipient - beforeSnap.feeRecipient,
            expectedProtocolFee,
            "Protocol fee mismatch"
        );

        uint256 creatorAmount = afterSnap.space - beforeSnap.space;
        uint256 expectedCreatorAmount = paidAmount - expectedProtocolFee;

        assertEq(creatorAmount, expectedCreatorAmount, "space amount mismatch");
        assertEq(
            expectedProtocolFee + creatorAmount,
            paidAmount,
            "distribution must sum to payment"
        );
    }

    function assertUSDCDistribution(
        uint256 originalBasePrice,
        uint256 renewalPrice,
        BalanceSnapshot memory beforeSnap,
        BalanceSnapshot memory afterSnap
    ) internal pure {
        // Verify payment distribution: account paid original renewal price
        uint256 paidAmount = beforeSnap.account - afterSnap.account;
        assertEq(paidAmount, renewalPrice, "Should pay renewal price in USDC");

        uint256 bpsFee = BasisPoints.calculate(originalBasePrice, USDC_FEE_BPS);
        uint256 expectedProtocolFee = bpsFee > USDC_MIN_FEE ? bpsFee : USDC_MIN_FEE;
        assertEq(
            afterSnap.feeRecipient - beforeSnap.feeRecipient,
            expectedProtocolFee,
            "Protocol fee mismatch"
        );

        uint256 creatorAmount = afterSnap.space - beforeSnap.space;
        uint256 expectedCreatorAmount = paidAmount - expectedProtocolFee;

        assertEq(creatorAmount, expectedCreatorAmount, "space amount mismatch");
        assertEq(
            expectedProtocolFee + creatorAmount,
            paidAmount,
            "distribution must sum to payment"
        );
    }

    function assertSubscriptionActive(address account, uint32 entityId) internal view {
        Subscription memory sub = subscriptionModule.getSubscription(account, entityId);
        assertTrue(sub.active, "Subscription should be active");
    }

    function expectInstallFailed(address module, bytes4 innerSelector) internal {
        vm.expectRevert(
            abi.encodeWithSelector(
                ModuleInstallCommonsLib.ModuleInstallCallbackFailed.selector,
                module,
                abi.encodeWithSelector(innerSelector)
            )
        );
    }
}
