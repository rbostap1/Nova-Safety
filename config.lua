------------------------------
--  Nova Safety - Config    --
------------------------------


Config = {}

Config.Command = 'Novasafe'
Config.DefaultHudVisible = true
Config.ShowZoneRadius = true
Config.RefreshIntervalMs = 250

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
        name = 'Mission Row Police Department',
        coords = vector3(425.1, -979.5, 30.7),
        radius = 140.0
    },
    {
        name = 'Sandy Shores Sheriff Station',
        coords = vector3(1853.2, 3686.6, 34.2),
        radius = 130.0
    },
    {
        name = 'Paleto Bay Sheriff Station',
        coords = vector3(-447.7, 6012.1, 31.7),
        radius = 130.0
    },
    {
        name = 'Pillbox Medical Center',
        coords = vector3(307.6, -595.2, 43.3),
        radius = 150.0
    },
    {
        name = 'Sandy Shores Medical Center',
        coords = vector3(1839.6, 3672.9, 34.3),
        radius = 120.0
    },
    {
        name = 'Paleto Bay Medical Center',
        coords = vector3(-264.9, 6325.3, 31.4),
        radius = 120.0
    },
    {
        name = 'Fire Station 1',
        coords = vector3(1204.8, -1474.8, 34.9),
        radius = 120.0
    },
    {
        name = 'Fire Station 2',
        coords = vector3(1690.0, 3588.7, 35.6),
        radius = 120.0
    },
    {
        name = 'Fire Station 3',
        coords = vector3(-370.2, 6111.0, 31.5),
        radius = 120.0
    }
}