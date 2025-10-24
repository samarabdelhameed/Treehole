// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PaymentSplitter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable treasury;

    event PaymentProcessed(
        address indexed payer,
        address indexed listener,
        uint256 amount,
        uint256 extensionTimeSeconds
    );

    constructor(address _treasury) {
        require(_treasury != address(0), "Treasury cannot be zero address");
        treasury = _treasury;
    }

    function payAndSplit(
        IERC20 token,
        address listener,
        uint256 amount,
        uint256 extensionTimeSeconds
    ) public nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        require(listener != address(0), "Listener cannot be zero address");

        token.safeTransferFrom(msg.sender, address(this), amount);

        uint256 listenerShare = amount / 2;
        uint256 treasuryShare = amount - listenerShare;

        token.safeTransfer(listener, listenerShare);
        token.safeTransfer(treasury, treasuryShare);

        emit PaymentProcessed(msg.sender, listener, amount, extensionTimeSeconds);
    }
}