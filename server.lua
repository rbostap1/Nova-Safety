local hudStates = {}

local function serializeZone(zone)
    local coords = zone.coords
    local x = tonumber(coords.x or coords[1] or 0.0) or 0.0
    local y = tonumber(coords.y or coords[2] or 0.0) or 0.0
    local z = tonumber(coords.z or coords[3] or 0.0) or 0.0
    local radius = tonumber(zone.radius or 0.0) or 0.0

    return string.format(
        [[
    {
        name = %q,
        coords = vector3(%.2f, %.2f, %.2f),
        radius = %.2f
    }]],
        zone.name,
        x,
        y,
        z,
        radius
    )
end

local function serializeZones(zones)
    local serialized = {}

    for index, zone in ipairs(zones) do
        serialized[#serialized + 1] = serializeZone(zone)
        if index < #zones then
            serialized[#serialized] = serialized[#serialized] .. ','
        end
    end

    return 'Config.Zones = {' .. table.concat(serialized) .. '\n}'
end

local function saveZonesToConfig(zones)
    local resourceName = GetCurrentResourceName()
    local configContent = LoadResourceFile(resourceName, 'config.lua')

    if not configContent then
        return false, 'Unable to read config.lua.'
    end

    local zonesStart, zonesLabelEnd = configContent:find('Config%.Zones%s*=%s*{')
    if not zonesStart then
        return false, 'Unable to locate Config.Zones in config.lua.'
    end

    local openBracePos = configContent:find('{', zonesLabelEnd)
    if not openBracePos then
        return false, 'Unable to parse Config.Zones in config.lua.'
    end

    local depth = 0
    local closeBracePos = nil

    for cursor = openBracePos, #configContent do
        local char = configContent:sub(cursor, cursor)
        if char == '{' then
            depth = depth + 1
        elseif char == '}' then
            depth = depth - 1
            if depth == 0 then
                closeBracePos = cursor
                break
            end
        end
    end

    if not closeBracePos then
        return false, 'Unable to locate the end of Config.Zones in config.lua.'
    end

    local prefix = configContent:sub(1, zonesStart - 1)
    local suffix = configContent:sub(closeBracePos + 1)
    local updatedContent = prefix .. serializeZones(zones) .. suffix

    local saved = SaveResourceFile(resourceName, 'config.lua', updatedContent, #updatedContent)
    if not saved then
        return false, 'Unable to write config.lua.'
    end

    return true
end

local function parseZoneInput(zoneData)
    local name = tostring(zoneData and zoneData.name or ''):gsub('^%s+', ''):gsub('%s+$', '')
    local x = tonumber(zoneData and zoneData.x)
    local y = tonumber(zoneData and zoneData.y)
    local z = tonumber(zoneData and zoneData.z)
    local radius = tonumber(zoneData and zoneData.radius)

    if name == '' or not x or not y or not z or not radius or radius <= 0 then
        return nil, 'Invalid zone data. Name, coordinates, and radius are required.'
    end

    return {
        name = name,
        coords = vector3(x, y, z),
        radius = radius
    }
end

local function syncZonesToClients(target)
    TriggerClientEvent('nova-safety:client:setZones', target or -1, Config.Zones or {})
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

    local parsedZone, parseError = parseZoneInput(zoneData)
    if not parsedZone then
        TriggerClientEvent('nova-safety:client:notify', sourceId, parseError)
        return
    end

    table.insert(Config.Zones, parsedZone)

    local success, errorMessage = saveZonesToConfig(Config.Zones)
    if not success then
        table.remove(Config.Zones, #Config.Zones)
        TriggerClientEvent('nova-safety:client:notify', sourceId, errorMessage or 'Unable to save the new safety zone.')
        return
    end

    syncZonesToClients(-1)
    TriggerClientEvent('nova-safety:client:refreshHud', sourceId)
    TriggerClientEvent('nova-safety:client:notify', sourceId, string.format('Added safety zone "%s" and saved it to config.lua.', parsedZone.name))
end)

RegisterNetEvent('nova-safety:server:editZone', function(zoneData)
    local sourceId = source

    if not canAccessHud(sourceId) then
        denyHudAccess(sourceId)
        return
    end

    local zoneIndex = tonumber(zoneData and zoneData.index)
    if not zoneIndex then
        TriggerClientEvent('nova-safety:client:notify', sourceId, 'Invalid zone index.')
        return
    end

    zoneIndex = math.floor(zoneIndex) + 1
    if zoneIndex < 1 or zoneIndex > #Config.Zones then
        TriggerClientEvent('nova-safety:client:notify', sourceId, 'Zone no longer exists.')
        return
    end

    local parsedZone, parseError = parseZoneInput(zoneData)
    if not parsedZone then
        TriggerClientEvent('nova-safety:client:notify', sourceId, parseError)
        return
    end

    local previousZone = Config.Zones[zoneIndex]
    Config.Zones[zoneIndex] = parsedZone

    local success, errorMessage = saveZonesToConfig(Config.Zones)
    if not success then
        Config.Zones[zoneIndex] = previousZone
        TriggerClientEvent('nova-safety:client:notify', sourceId, errorMessage or 'Unable to save edited safety zone.')
        return
    end

    syncZonesToClients(-1)
    TriggerClientEvent('nova-safety:client:refreshHud', sourceId)
    TriggerClientEvent('nova-safety:client:notify', sourceId, string.format('Updated safety zone "%s".', parsedZone.name))
end)

RegisterNetEvent('nova-safety:server:deleteZone', function(zoneData)
    local sourceId = source

    if not canAccessHud(sourceId) then
        denyHudAccess(sourceId)
        return
    end

    local zoneIndex = tonumber(zoneData and zoneData.index)
    if not zoneIndex then
        TriggerClientEvent('nova-safety:client:notify', sourceId, 'Invalid zone index.')
        return
    end

    zoneIndex = math.floor(zoneIndex) + 1
    if zoneIndex < 1 or zoneIndex > #Config.Zones then
        TriggerClientEvent('nova-safety:client:notify', sourceId, 'Zone no longer exists.')
        return
    end

    local removedZone = table.remove(Config.Zones, zoneIndex)
    local success, errorMessage = saveZonesToConfig(Config.Zones)
    if not success then
        table.insert(Config.Zones, zoneIndex, removedZone)
        TriggerClientEvent('nova-safety:client:notify', sourceId, errorMessage or 'Unable to delete safety zone.')
        return
    end

    syncZonesToClients(-1)
    TriggerClientEvent('nova-safety:client:refreshHud', sourceId)
    TriggerClientEvent('nova-safety:client:notify', sourceId, string.format('Deleted safety zone "%s".', removedZone.name))
end)