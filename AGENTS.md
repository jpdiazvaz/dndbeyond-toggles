# DnD Beyond Customizable Toggles

This Chrome extension is designed to inject custom UI elements into [D&D Beyond](https://www.dndbeyond.com) character sheets (specifically targeting urls matching `https://www.dndbeyond.com/characters/<CHARACTER_ID>`).

## Core Functionality

The primary goal of this extension is to add interactive buttons and toggles to the character sheet to handle dynamic or temporary stat changes that are normally tedious to manage manually. 

Key features include:
- **Armor Class (AC) Modifiers**: Toggles to easily apply and remove temporary changes to AC (e.g., casting the *Mage Armor* spell, using the *Shield* spell, or gaining cover).
- **Temporary Hit Points**: Buttons and toggles to quickly add, track, or remove temporary hit points (e.g., from entering a Druid's *Wild Shape*, the *Armor of Agathys* spell, or similar abilities).

## Design & UI Requirements

- **Native Style**: A strict requirement for this extension is that all injected UI elements (buttons, toggles, panels) MUST match the default styling of the D&D Beyond character sheet. This involves reusing existing D&D Beyond CSS classes, fonts, colors, and layout patterns so the new elements blend seamlessly and look like native features.

## Architecture Context

- **Environment**: Chrome Extension (Manifest V3)
- **Content Scripts**: Used to read the DOM for the current character stat values and inject our custom UI elements in relevant locations (like near the AC box or Health box).
- **State Management**: The extension may need to persist the state of toggles (e.g., if Mage Armor is active) using Chrome's local storage so that stats remain correct on page refresh.
