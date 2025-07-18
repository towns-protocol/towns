// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {Vm} from "forge-std/Vm.sol";
import {ITownsPoints, ITownsPointsBase} from "src/airdrop/points/ITownsPoints.sol";
import {IERC721A, IERC721ABase} from "src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IArchitectBase} from "src/factory/facets/architect/IArchitect.sol";
import {IPartnerRegistry} from "src/factory/facets/partner/IPartnerRegistry.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IWalletLink, IWalletLinkBase} from "src/factory/facets/wallet-link/IWalletLink.sol";
import {IEntitlement, IEntitlementBase} from "src/spaces/entitlements/IEntitlement.sol";
import {IEntitlementsManager, IEntitlementsManagerBase} from "src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IMembership, IMembershipBase} from "src/spaces/facets/membership/IMembership.sol";
import {IPrepay} from "src/spaces/facets/prepay/IPrepay.sol";
import {IReferrals} from "src/spaces/facets/referrals/IReferrals.sol";
import {IRoles, IRolesBase} from "src/spaces/facets/roles/IRoles.sol";
import {ITreasury} from "src/spaces/facets/treasury/ITreasury.sol";
import {IERC721AQueryable} from "src/diamond/facets/token/ERC721A/extensions/IERC721AQueryable.sol";

// libraries
import {Permissions} from "src/spaces/facets/Permissions.sol";
import {RuleEntitlementUtil} from "test/crosschain/RuleEntitlementUtil.sol";

// contracts
import {Architect} from "src/factory/facets/architect/Architect.sol";
import {CreateSpaceFacet} from "src/factory/facets/create/CreateSpace.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";

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
    IERC721A internal membershipToken;
    IERC721AQueryable internal membershipTokenQueryable;
    IPlatformRequirements internal platformReqs;
    IPartnerRegistry internal partnerRegistry;
    IPrepay prepayFacet;
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
        userSpaceInfo.membership.settings.freeAllocation = FREE_ALLOCATION;

        IArchitectBase.SpaceInfo memory dynamicSpaceInfo = _createUserSpaceInfo(
            "DynamicSpace",
            allowedUsers
        );
        dynamicSpaceInfo.membership.settings.pricingModule = pricingModule;

        IArchitectBase.SpaceInfo memory freeSpaceInfo = _createEveryoneSpaceInfo("FreeSpace");
        freeSpaceInfo.membership.settings.freeAllocation = 100;
        freeSpaceInfo.membership.settings.price = 0;
        freeSpaceInfo.membership.settings.pricingModule = fixedPricingModule;

        vm.startPrank(founder);
        // user space is a space where only alice and charlie are allowed along with the founder
        userSpace = CreateSpaceFacet(spaceFactory).createSpace(userSpaceInfo);
        dynamicSpace = CreateSpaceFacet(spaceFactory).createSpace(dynamicSpaceInfo);
        freeSpace = CreateSpaceFacet(spaceFactory).createSpace(freeSpaceInfo);
        vm.stopPrank();

        membership = IMembership(userSpace);
        membershipToken = IERC721A(userSpace);
        membershipTokenQueryable = IERC721AQueryable(userSpace);
        prepayFacet = IPrepay(userSpace);
        referrals = IReferrals(userSpace);
        treasury = ITreasury(userSpace);
        platformReqs = IPlatformRequirements(spaceFactory);
        partnerRegistry = IPartnerRegistry(spaceFactory);
        _registerOperators();
        _registerNodes();
    }

    modifier givenMembershipHasPrice() {
        vm.startPrank(founder);
        membership.setMembershipFreeAllocation(1);
        membership.setMembershipPrice(MEMBERSHIP_PRICE);
        vm.stopPrank();
        _;
    }

    modifier givenAliceHasPaidMembership() {
        hoax(alice, MEMBERSHIP_PRICE);
        membership.joinSpace{value: MEMBERSHIP_PRICE}(alice);
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
        vm.startPrank(founder);
        IEntitlementsManagerBase.Entitlement[] memory entitlements = IEntitlementsManager(userSpace)
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

        IRoles(userSpace).createRole(
            "joinspace-crosschain-multi-entitlement-1",
            permissions,
            createEntitlements1
        );
        IRoles(userSpace).createRole(
            "joinspace-crosschain-multi-entitlement-2",
            permissions,
            createEntitlements2
        );
        vm.stopPrank();
        _;
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
