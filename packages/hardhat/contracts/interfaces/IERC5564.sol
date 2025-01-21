// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IERC5564 {
    /// @notice Emitted when sending something to a stealth address
    event Announcement(
        uint256 indexed schemeId,
        address indexed stealthAddress,
        address indexed caller,
        bytes ephemeralPubKey,
        bytes metadata
    );

    /// @notice Announces that something was sent to a stealth address
    /// @param schemeId The ID of the stealth address scheme being used
    /// @param stealthAddress The stealth address that will receive the assets
    /// @param ephemeralPubKey Ephemeral public key used by the sender
    /// @param metadata Additional metadata for the announcement (viewTag etc)
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external;
} 