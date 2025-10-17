// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IPaymentSplitter.sol";

contract PaymentSplitter is IPaymentSplitter, Ownable, ReentrancyGuard {
    IERC20 public immutable token;
    address public treasury;

    constructor(address _token, address _treasury) {
        require(_token != address(0), "Invalid token address");
        require(_treasury != address(0), "Invalid treasury address");
        
        token = IERC20(_token);
        treasury = _treasury;
    }

    function payAndSplit(
        uint256 amount,
        address listener,
        uint256 extensionTimeSeconds
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(listener != address(0), "Invalid listener address");
        
        // Transfer full amount from payer
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        // Split 50/50
        uint256 halfAmount = amount / 2;
        
        // Send to listener and treasury
        require(token.transfer(listener, halfAmount), "Transfer to listener failed");
        require(token.transfer(treasury, halfAmount), "Transfer to treasury failed");
        
        emit PaymentProcessed(msg.sender, listener, amount, extensionTimeSeconds);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        
        address oldTreasury = treasury;
        treasury = newTreasury;
        
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
}