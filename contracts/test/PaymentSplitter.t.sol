// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {TestToken} from "../src/TestToken.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {PaymentSplitter} from "../src/PaymentSplitter.sol";

contract PaymentSplitterTest is Test {
    TestToken public token;
    PaymentSplitter public splitter;

    address public payer = vm.addr(1);
    address public listener = vm.addr(2);
    address public treasury = vm.addr(3);
    uint256 public constant PAYMENT_AMOUNT = 100 ether;
    uint256 public constant TIME_EXTENSION = 600; // 10 minutes

    function setUp() public {
        token = new TestToken();
        splitter = new PaymentSplitter(treasury);

        // Faucet for payer
        vm.prank(payer);
        token.claimFaucet();

        // Approve splitter to pull funds
        vm.prank(payer);
        token.approve(address(splitter), PAYMENT_AMOUNT);
    }

    function testSuccessfulSplit() public {
        // Initial balances are zero
        assertEq(token.balanceOf(listener), 0, "Listener balance must be zero initially");
        assertEq(token.balanceOf(treasury), 0, "Treasury balance must be zero initially");

        // Execute payment
        vm.prank(payer);
        splitter.payAndSplit(token, listener, PAYMENT_AMOUNT, TIME_EXTENSION);

        uint256 expectedShare = PAYMENT_AMOUNT / 2;
        assertEq(token.balanceOf(listener), expectedShare, "Listener received incorrect share");
        assertEq(token.balanceOf(treasury), expectedShare, "Treasury received incorrect share");

        uint256 remainingBalance = 900 ether;
        assertEq(token.balanceOf(payer), remainingBalance, "Payer balance incorrect");
    }

    function testEventEmitted() public {
        vm.prank(payer);
        vm.expectEmit(true, true, true, true);
        emit PaymentSplitter.PaymentProcessed(
            payer,
            listener,
            PAYMENT_AMOUNT,
            TIME_EXTENSION
        );
        splitter.payAndSplit(token, listener, PAYMENT_AMOUNT, TIME_EXTENSION);
    }

    function test_RevertWithoutApproval() public {
        TestToken newToken = new TestToken();
        PaymentSplitter newSplitter = new PaymentSplitter(treasury);

        vm.prank(payer);
        newToken.claimFaucet();

        vm.prank(payer);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientAllowance.selector,
                address(newSplitter),
                0,
                PAYMENT_AMOUNT
            )
        );
        newSplitter.payAndSplit(newToken, listener, PAYMENT_AMOUNT, TIME_EXTENSION);
    }
}