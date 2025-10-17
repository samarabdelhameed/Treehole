// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/PaymentSplitter.sol";
import "../src/TestToken.sol";

contract PaymentSplitterTest is Test {
    PaymentSplitter public splitter;
    TestToken public token;
    
    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public payer = address(0x3);
    address public listener = address(0x4);
    
    function setUp() public {
        vm.startPrank(owner);
        token = new TestToken();
        splitter = new PaymentSplitter(address(token), treasury);
        vm.stopPrank();
        
        // Setup balances
        token.mint(payer, 1000 * 10**18);
    }
    
    function testPayAndSplit() public {
        uint256 amount = 100 * 10**18;
        
        vm.startPrank(payer);
        token.approve(address(splitter), amount);
        
        vm.expectEmit(true, true, false, true);
        emit IPaymentSplitter.PaymentProcessed(payer, listener, amount, 600);
        
        splitter.payAndSplit(amount, listener, 600);
        vm.stopPrank();
        
        assertEq(token.balanceOf(listener), amount / 2);
        assertEq(token.balanceOf(treasury), amount / 2);
    }
}