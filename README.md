# Nova-Safety
Nova-Safety is a configurable FiveM safety-zone resource with a toggleable HUD and built-in safety-area notifications.

## Features

- `/Novasafe` command to show or hide the HUD
- Config-driven safety zones in `config.lua`
- Fully interactive HUD (mouse/keyboard) with `Esc` to close
- Current player coordinates and active zone display
- List of all configured safety zones in the HUD
- Safety-area enter message when a player enters a zone:
	- `Safe Area: <Zone Name>, no vilant RP is to take place here.`
- Add, edit, and delete safety zones from the HUD
- Zone changes are persisted to `config.lua`
- `Use Current Position` helper for quick zone creation
- Default HUD zone radius value of `5`
- HUD branding support (custom name and logo)
- Optional Discord role locking for the HUD and zone editor

## Resource Setup

The resource is started like any other FiveM resource.

```cfg
ensure Nova-Safety
```

## Usage

- Use `/Novasafe` in-game to toggle the HUD.
- You can manage zones directly in the HUD:
	- Add a new zone
	- Edit an existing zone
	- Delete an existing zone
- Click `Use Current Position` to fill X/Y/Z from your current location.
- Press `Esc` while the HUD is open to close it.
- Entering a configured zone will show a safety-area warning message.
- Zone edits are written directly into `config.lua`.

## Discord Access Control

Set `Config.HudAccess.Enabled = true` to require Discord-based access before the HUD and zone editor can be opened.

- Use `Provider = 'Badger_Discord_API'` with role IDs in `BadgerRoles`.
- Use `Provider = 'DiscordAcePerms'` with an ACE permission in `AcePermission`.
- If access is denied, the player sees the message configured in `DenyMessage`.

## Install

1. Drop the `Nova-Safety` folder into your server resources.
2. Add `ensure Nova-Safety` to your server config.
3. Edit `config.lua` to set command/access/branding defaults as needed.

## Config Example

```lua
Config.Command = 'Novasafe'
Config.DefaultHudVisible = true
Config.ShowZoneRadius = true
Config.RefreshIntervalMs = 250

Config.HudBrand = {
	Name = 'Nova Safety',
	LogoUrl = '' -- Example: 'https://example.com/logo.png'
}

Config.HudAccess = {
	Enabled = false,
	Provider = 'Badger_Discord_API',
	DenyMessage = 'You do not have permission to open the Nova Safety HUD.',
	BadgerRoles = {
		'123456789012345678'
	},
	AcePermission = 'nova-safety.hud'
}

Config.Zones = {
	{
		name = 'Legion Square',
		coords = vector3(215.76, -810.12, 30.73),
		radius = 5.0
	}
}
```

## HUD Branding

Use `Config.HudBrand` to customize header branding:

- `Name`: text shown at the top-left of the HUD
- `LogoUrl`: optional URL for a logo image

If `LogoUrl` is empty, the HUD will show only the name.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
