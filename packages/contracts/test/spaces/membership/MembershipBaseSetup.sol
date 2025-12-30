// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {Vm} from "forge-std/Vm.sol";
import {ITownsPoints, ITownsPointsBase} from "src/airdrop/points/ITownsPoints.sol";
import {IERC721A, IERC721ABase} from "src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IArchitectBase} from "src/factory/facets/architect/IArchitect.sol";
import {IFeeManager} from "src/factory/facets/fee/IFeeManager.sol";
import {IPartnerRegistry} from "src/factory/facets/partner/IPartnerRegistry.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IWalletLink, IWalletLinkBase} from "src/factory/facets/wallet-link/IWalletLink.sol";
import {IEntitlement, IEntitlementBase} from "src/spaces/entitlements/IEntitlement.sol";
import {IEntitlementsManager, IEntitlementsManagerBase} from "src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IMembership, IMembershipBase} from "src/spaces/facets/membership/IMembership.sol";
import {IReferrals} from "src/spaces/facets/referrals/IReferrals.sol";
import {IRoles, IRolesBase} from "src/spaces/facets/roles/IRoles.sol";
import {ITreasury} from "src/spaces/facets/treasury/ITreasury.sol";
import {IERC721AQueryable} from "src/diamond/facets/token/ERC721A/extensions/IERC721AQueryable.sol";

// libraries
import {FeeCalculationMethod} from "src/factory/facets/fee/FeeManagerStorage.sol";
import {FeeTypesLib} from "src/factory/facets/fee/FeeTypesLib.sol";

// libraries
import {Permissions} from "src/spaces/facets/Permissions.sol";
import {RuleEntitlementUtil} from "test/crosschain/RuleEntitlementUtil.sol";

// contracts
import {Architect} from "src/factory/facets/architect/Architect.sol";
import {CreateSpaceFacet} from "src/factory/facets/create/CreateSpace.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";

// mocks
import {MockERC20} from "test/mocks/MockERC20.sol";

contract MembershipBaseSetup is
    IMembershipBase,
    IEntitlementBase,
    IERC721ABase,
    IOwnableBase,
    IWalletLinkBase,
    BaseSetup
{
    int256 internal constant EXCHANGE_RATE = 222_616_000_000;
    uint256 internal constant MAX_BPS = 10_000; // 100%
    uint256 constant REFERRAL_CODE = 999;
    uint16 constant REFERRAL_BPS = 1000; // 10%
    uint256 constant MEMBERSHIP_PRICE = 1 ether;

    IMembership internal membership;
    IMembership internal freeMembership;
    IERC721A internal membershipToken;
    IERC721AQueryable internal membershipTokenQueryable;
    IPlatformRequirements internal platformReqs;
    IPartnerRegistry internal partnerRegistry;
    IReferrals internal referrals;
    ITreasury internal treasury;
    // entitled user
    Vm.Wallet aliceWallet;
    Vm.Wallet charlieWallet;

    address internal alice;
    address internal charlie;

    // non-entitled user
    Vm.Wallet bobWallet;
    address internal bob;

    // receiver of protocol fees
    address internal feeRecipient;

    address internal userSpace;
    address internal dynamicSpace;
    address internal freeSpace;
    address internal usdcSpace;

    MockERC20 internal mockUSDC;
    IMembership internal usdcMembership;
    IERC721A internal usdcMembershipToken;

    function setUp() public virtual override {
        super.setUp();

        aliceWallet = vm.createWallet("alice");
        charlieWallet = vm.createWallet("charlie");
        bobWallet = vm.createWallet("bob");

        alice = aliceWallet.addr;
        bob = bobWallet.addr;
        charlie = charlieWallet.addr;
        feeRecipient = founder;

        address[] memory allowedUsers = new address[](2);
        allowedUsers[0] = alice;
        allowedUsers[1] = charlie;

        IArchitectBase.SpaceInfo memory userSpaceInfo = _createUserSpaceInfo(
            "MembershipSpace",
            allowedUsers
        );
        userSpaceInfo.membership.settings.pricingModule = fixedPricingModule;

        IArchitectBase.SpaceInfo memory dynamicSpaceInfo = _createUserSpaceInfo(
            "DynamicSpace",
            allowedUsers
        );
        dynamicSpaceInfo.membership.settings.pricingModule = pricingModule;

        IArchitectBase.SpaceInfo memory freeSpaceInfo = _createEveryoneSpaceInfo("FreeSpace");
        freeSpaceInfo.membership.settings.freeAllocation = 100;
        freeSpaceInfo.membership.settings.price = 0;
        freeSpaceInfo.membership.settings.pricingModule = fixedPricingModule;

        // Deploy mock USDC and configure fee
        mockUSDC = new MockERC20("USD Coin", "USDC", 6);
        vm.prank(deployer);
        IFeeManager(spaceFactory).setFeeConfig(
            FeeTypesLib.membership(address(mockUSDC)),
            deployer,
            FeeCalculationMethod.HYBRID,
            1000, // 10%
            1_500_000, // $1.50 minimum (6 decimals)
            true
        );

        // Create USDC space
        IArchitectBase.SpaceInfo memory usdcSpaceInfo = _createUserSpaceInfo(
            "USDCSpace",
            allowedUsers
        );
        usdcSpaceInfo.membership.settings.pricingModule = fixedPricingModule;
        usdcSpaceInfo.membership.settings.currency = address(mockUSDC);

        vm.startPrank(founder);
        // user space is a space where only alice and charlie are allowed along with the founder
        userSpace = CreateSpaceFacet(spaceFactory).createSpace(userSpaceInfo);
        dynamicSpace = CreateSpaceFacet(spaceFactory).createSpace(dynamicSpaceInfo);
        freeSpace = CreateSpaceFacet(spaceFactory).createSpace(freeSpaceInfo);
        usdcSpace = CreateSpaceFacet(spaceFactory).createSpace(usdcSpaceInfo);
        vm.stopPrank();

        membership = IMembership(userSpace);
        membershipToken = IERC721A(userSpace);
        membershipTokenQueryable = IERC721AQueryable(userSpace);
        freeMembership = IMembership(freeSpace);
        usdcMembership = IMembership(usdcSpace);
        usdcMembershipToken = IERC721A(usdcSpace);
        referrals = IReferrals(userSpace);
        treasury = ITreasury(userSpace);
        platformReqs = IPlatformRequirements(spaceFactory);
        partnerRegistry = IPartnerRegistry(spaceFactory);
        _registerOperators();
        _registerNodes();
    }

    modifier givenMembershipHasPrice() {
        vm.startPrank(founder);
        // membership.setMembershipFreeAllocation(1);
        membership.setMembershipPrice(MEMBERSHIP_PRICE);
        vm.stopPrank();
        _;
    }

    modifier givenUSDCMembershipHasPrice() {
        vm.startPrank(founder);
        usdcMembership.setMembershipPrice(10_000_000); // $10 USDC (6 decimals)
        vm.stopPrank();
        _;
    }

    modifier givenAliceHasPaidMembership() {
        uint256 membershipPrice = membership.getMembershipPrice();
        hoax(alice, membershipPrice);
        membership.joinSpace{value: membershipPrice}(alice);
        assertEq(membershipToken.balanceOf(alice), 1);
        _;
    }

    modifier givenAliceHasMintedMembership() {
        vm.prank(alice);
        membership.joinSpace(alice);
        _;
    }

    modifier givenWalletIsLinked(Vm.Wallet memory rootWallet, Vm.Wallet memory newWallet) {
        IWalletLink wl = IWalletLink(spaceFactory);

        uint256 nonce = wl.getLatestNonceForRootKey(newWallet.addr);

        bytes memory signature = _signWalletLink(rootWallet.privateKey, newWallet.addr, nonce);

        vm.startPrank(newWallet.addr);
        vm.expectEmit(address(wl));
        emit LinkWalletToRootKey(newWallet.addr, rootWallet.addr);
        wl.linkCallerToRootKey(
            LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
            nonce
        );
        vm.stopPrank();
        _;
    }

    modifier givenJoinspaceHasAdditionalCrosschainEntitlements() {
        _addCrosschainEntitlements(userSpace);
        _;
    }

    modifier givenUSDCSpaceHasCrosschainEntitlements() {
        _addCrosschainEntitlements(usdcSpace);
        _;
    }

    function _addCrosschainEntitlements(address space) internal {
        vm.startPrank(founder);
        IEntitlementsManagerBase.Entitlement[] memory entitlements = IEntitlementsManager(space)
            .getEntitlements();
        IEntitlement ruleEntitlement = IEntitlement(entitlements[1].moduleAddress);

        // IRuleEntitlements only allow one entitlement per role, so create 2 roles to add 2 rule
        // entitlements that need to be checked for the joinSpace permission.
        IRolesBase.CreateEntitlement[]
            memory createEntitlements1 = new IRolesBase.CreateEntitlement[](1);
        IRolesBase.CreateEntitlement[]
            memory createEntitlements2 = new IRolesBase.CreateEntitlement[](1);

        createEntitlements1[0] = IRolesBase.CreateEntitlement({
            module: ruleEntitlement,
            data: abi.encode(RuleEntitlementUtil.getMockERC20RuleData())
        });
        createEntitlements2[0] = IRolesBase.CreateEntitlement({
            module: ruleEntitlement,
            data: abi.encode(RuleEntitlementUtil.getMockERC1155RuleData())
        });

        string[] memory permissions = new string[](1);
        permissions[0] = Permissions.JoinSpace;

        IRoles(space).createRole(
            "joinspace-crosschain-multi-entitlement-1",
            permissions,
            createEntitlements1
        );
        IRoles(space).createRole(
            "joinspace-crosschain-multi-entitlement-2",
            permissions,
            createEntitlements2
        );
        vm.stopPrank();
    }

    modifier givenFounderIsCaller() {
        vm.startPrank(founder);
        _;
    }

    function _getPoints(uint256 price) internal view returns (uint256) {
        return
            ITownsPoints(riverAirdrop).getPoints(
                ITownsPointsBase.Action.JoinSpace,
                abi.encode(price)
            );
    }
}
