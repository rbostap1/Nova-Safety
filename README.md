# Nova-Safety
Nova-Safety is a configurable FiveM safety-zone resource with a toggleable HUD and built-in safety-area notifications.

## Features

- `/Novasafe` command to show or hide the HUD
- Config-driven safety zones in `config.lua`
- Current player coordinates and active zone display
- List of all configured safety zones in the HUD
- Safety-area enter message when a player enters a zone

## Resource Setup

The resource is started like any other FiveM resource.

```cfg
ensure Nova-Safety
```

## Usage

- Use `/Novasafe` in-game to toggle the HUD.
- Edit `config.lua` to add, remove, or adjust safety zones.
- Entering a configured zone will show a safety-area warning message.

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
