local hudStates = {}

local function serializeZone(zone)
    return string.format(
        [[
    {
        name = %q,
        coords = vector3(%.2f, %.2f, %.2f),
        radius = %.2f
    }]],
        zone.name,
        zone.coords.x,
        zone.coords.y,
        zone.coords.z,
        zone.radius
    )
end

local function appendZoneToConfig(zone)
    local resourceName = GetCurrentResourceName()
    local configContent = LoadResourceFile(resourceName, 'config.lua')

    if not configContent then
        return false, 'Unable to read config.lua.'
    end

    local closeStart = configContent:find('}%s*$')
    if not closeStart then
        return false, 'Unable to locate the end of Config.Zones in config.lua.'
    end

    local prefix = configContent:sub(1, closeStart - 1):gsub('%s*$', '')
    local suffix = configContent:sub(closeStart)
    local updatedContent = prefix .. ',' .. serializeZone(zone) .. '\n' .. suffix

    local saved = SaveResourceFile(resourceName, 'config.lua', updatedContent, #updatedContent)
    if not saved then
        return false, 'Unable to write config.lua.'
    end

    return true
end

local function getHudAccessConfig()
    return Config.HudAccess or {}
end

local function isHudAccessEnabled()
    local accessConfig = getHudAccessConfig()
    return accessConfig.Enabled == true
end

local function hasDiscordAcePermsAccess(playerSource)
    local accessConfig = getHudAccessConfig()
    local permission = accessConfig.AcePermission

    if not permission or permission == '' then
        return false
    end

    return IsPlayerAceAllowed(playerSource, permission)
end

local function hasBadgerDiscordApiAccess(playerSource)
    local accessConfig = getHudAccessConfig()
    local allowedRoles = accessConfig.BadgerRoles or {}

    if GetResourceState('Badger_Discord_API') ~= 'started' then
        return false, 'Badger_Discord_API is not started.'
    end

    local badgerExports = exports['Badger_Discord_API']

    local function roleMatches(activeRoles)
        if type(activeRoles) ~= 'table' then
            activeRoles = { activeRoles }
        end

        for _, activeRole in ipairs(activeRoles) do
            local activeRoleString = tostring(activeRole)
            for _, allowedRole in ipairs(allowedRoles) do
                if tostring(allowedRole) == activeRoleString then
                    return true
                end
            end
        end

        return false
    end

    local roleFetchers = {
        function()
            return badgerExports:GetDiscordRoles(playerSource)
        end,
        function()
            return badgerExports:GetDiscordRoleIDs(playerSource)
        end,
        function()
            return badgerExports:GetRoles(playerSource)
        end
    }

    for _, fetchRoleList in ipairs(roleFetchers) do
        local ok, roles = pcall(fetchRoleList)
        if ok and roles ~= nil and roleMatches(roles) then
            return true
        end
    end

    local roleChecks = {
        'CheckDiscordRole',
        'CheckRole',
        'HasRole'
    }

    for _, methodName in ipairs(roleChecks) do
        local ok, result = pcall(function()
            return badgerExports[methodName](badgerExports, playerSource, allowedRoles[1])
        end)

        if ok and result == true then
            return true
        end
    end

    return false
end

local function canAccessHud(playerSource)
    if not isHudAccessEnabled() then
        return true
    end

    local accessConfig = getHudAccessConfig()
    local provider = tostring(accessConfig.Provider or '')

    if provider == 'DiscordAcePerms' then
        return hasDiscordAcePermsAccess(playerSource)
    end

    if provider == 'Badger_Discord_API' then
        local hasAccess = hasBadgerDiscordApiAccess(playerSource)
        return hasAccess == true
    end

    return false
end

local function sendHudState(playerSource, visible)
    hudStates[playerSource] = visible == true
    TriggerClientEvent('nova-safety:client:setHudVisible', playerSource, hudStates[playerSource])
end

local function denyHudAccess(playerSource)
    local accessConfig = getHudAccessConfig()
    TriggerClientEvent('nova-safety:client:notify', playerSource, accessConfig.DenyMessage or 'You do not have access to the Nova Safety HUD.')
    sendHudState(playerSource, false)
end

RegisterNetEvent('nova-safety:server:requestSync', function()
    TriggerClientEvent('nova-safety:client:refreshHud', source)
    TriggerClientEvent('nova-safety:client:setZones', source, Config.Zones or {})
end)

RegisterNetEvent('nova-safety:server:requestHudState', function()
    local playerSource = source

    if not canAccessHud(playerSource) then
        denyHudAccess(playerSource)
        return
    end

    sendHudState(playerSource, Config.DefaultHudVisible == true)
end)

RegisterNetEvent('nova-safety:server:requestHudToggle', function()
    local playerSource = source

    if not canAccessHud(playerSource) then
        denyHudAccess(playerSource)
        return
    end

    local newState = not hudStates[playerSource]
    sendHudState(playerSource, newState)

    if newState then
        TriggerClientEvent('nova-safety:client:refreshHud', playerSource)
        TriggerClientEvent('nova-safety:client:setZones', playerSource, Config.Zones or {})
    end
end)

RegisterNetEvent('nova-safety:server:addZone', function(zoneData)
    local sourceId = source

    if not canAccessHud(sourceId) then
        denyHudAccess(sourceId)
        return
    end

    local name = tostring(zoneData and zoneData.name or ''):gsub('^%s+', ''):gsub('%s+$', '')
    local x = tonumber(zoneData and zoneData.x)
    local y = tonumber(zoneData and zoneData.y)
    local z = tonumber(zoneData and zoneData.z)
    local radius = tonumber(zoneData and zoneData.radius)

    if name == '' or not x or not y or not z or not radius or radius <= 0 then
        TriggerClientEvent('nova-safety:client:notify', sourceId, 'Invalid zone data. Name, coordinates, and radius are required.')
        return
    end

    local newZone = {
        name = name,
        coords = {
            x = x,
            y = y,
            z = z
        },
        radius = radius
    }

    local success, errorMessage = appendZoneToConfig(newZone)
    if not success then
        TriggerClientEvent('nova-safety:client:notify', sourceId, errorMessage or 'Unable to save the new safety zone.')
        return
    end

    table.insert(Config.Zones, {
        name = newZone.name,
        coords = vector3(newZone.coords.x, newZone.coords.y, newZone.coords.z),
        radius = newZone.radius
    })

    TriggerClientEvent('nova-safety:client:setZones', -1, Config.Zones)
    TriggerClientEvent('nova-safety:client:refreshHud', sourceId)
    TriggerClientEvent('nova-safety:client:notify', sourceId, string.format('Added safety zone "%s" and saved it to config.lua.', newZone.name))
end)