# Nova-Safety
Nova-Safety is a configurable FiveM safety-zone resource with a toggleable HUD and built-in safety-area notifications.

## Features

- `/Novasafe` command to show or hide the HUD
- Config-driven safety zones in `config.lua`
- Current player coordinates and active zone display
- List of all configured safety zones in the HUD
- Safety-area enter message when a player enters a zone
- Add new safety zones from the HUD and save them to `config.lua`
- Optional Discord role locking for the HUD and zone editor

## Resource Setup

The resource is started like any other FiveM resource.

```cfg
ensure Nova-Safety
```

## Usage

- Use `/Novasafe` in-game to toggle the HUD.
- Edit `config.lua` to add, remove, or adjust safety zones.
- Entering a configured zone will show a safety-area warning message.
- Use the HUD editor to create a new zone and write it directly into `config.lua`.

The HUD editor includes a `Use Current Position` button so you can quickly build a zone around where you are standing.

## Discord Access Control

Set `Config.HudAccess.Enabled = true` to require Discord-based access before the HUD and zone editor can be opened.

- Use `Provider = 'Badger_Discord_API'` with role IDs in `BadgerRoles`.
- Use `Provider = 'DiscordAcePerms'` with an ACE permission in `AcePermission`.
- If access is denied, the player sees the message configured in `DenyMessage`.

## Install

1. Drop the `Nova-Safety` folder into your server resources.
2. Add `ensure Nova-Safety` to your server config.
3. Edit `config.lua` to add or update safety zones.

## Config Example

```lua
Config.Zones = {
	{
		name = 'Legion Square',
		coords = vector3(215.76, -810.12, 30.73),
		radius = 120.0
	}
}
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
