local hudVisible = false
local currentZoneName = 'None'
local currentZoneCoords = 'N/A'
local currentZoneRadius = 'N/A'
local safetyActive = false
local lastSafetyZoneName = nil
local currentPlayerCoords = { x = 0.0, y = 0.0, z = 0.0 }
local safetyZones = Config.Zones or {}
local updateHud

local function formatCoords(coords)
    return string.format('%.2f, %.2f, %.2f', coords.x, coords.y, coords.z)
end

local function getZoneCoords(zone)
    local coords = zone.coords

    if coords.x ~= nil and coords.y ~= nil and coords.z ~= nil then
        return vector3(coords.x, coords.y, coords.z)
    end

    return vector3(coords[1], coords[2], coords[3])
end

local function showSafetyNotification(message)
    SetNotificationTextEntry('STRING')
    AddTextComponentString(message)
    DrawNotification(false, true)
end

local function showUiNotification(message)
    SendNUIMessage({
        action = 'notify',
        message = message
    })
end

local function setHudVisible(visible)
    hudVisible = visible == true

    SendNUIMessage({
        action = 'setVisible',
        visible = hudVisible
    })

    if hudVisible then
        local playerPed = PlayerPedId()
        if playerPed ~= 0 then
            updateHud(GetEntityCoords(playerPed))
        end
    end
end

local function getClosestZone(playerCoords)
    local closestZone = nil
    local closestDistance = nil

    for _, zone in ipairs(safetyZones) do
        local distance = #(playerCoords - getZoneCoords(zone))
        if distance <= zone.radius and (closestDistance == nil or distance < closestDistance) then
            closestZone = zone
            closestDistance = distance
        end
    end

    return closestZone
end

updateHud = function(playerCoords)
    currentPlayerCoords = {
        x = playerCoords.x,
        y = playerCoords.y,
        z = playerCoords.z
    }

    local zone = getClosestZone(playerCoords)
    local zoneJustEntered = false

    if zone then
        currentZoneName = zone.name
        currentZoneCoords = formatCoords(getZoneCoords(zone))
        currentZoneRadius = string.format('%.0f m', zone.radius)
        safetyActive = true

        if lastSafetyZoneName ~= zone.name then
            zoneJustEntered = true
            lastSafetyZoneName = zone.name
        end
    else
        currentZoneName = 'None'
        currentZoneCoords = 'N/A'
        currentZoneRadius = 'N/A'
        safetyActive = false
        lastSafetyZoneName = nil
    end

    SendNUIMessage({
        action = 'updateHud',
        visible = hudVisible,
        currentPosition = formatCoords(playerCoords),
        currentCoords = currentPlayerCoords,
        currentZone = {
            name = currentZoneName,
            coords = currentZoneCoords,
            radius = currentZoneRadius,
            active = safetyActive
        },
        zones = safetyZones,
        showRadius = Config.ShowZoneRadius
    })

    if zoneJustEntered then
        showSafetyNotification(string.format(
            'You have entered %s. This is a safety area. Violating roleplay is not to take place in or near these areas.',
            zone.name
        ))
        showUiNotification(string.format(
            'You have entered %s. This is a safety area. Violating roleplay is not to take place in or near these areas.',
            zone.name
        ))
    end
end

local function updateCurrentPlayerCoords(playerCoords)
    currentPlayerCoords = {
        x = playerCoords.x,
        y = playerCoords.y,
        z = playerCoords.z
    }
end

RegisterCommand(Config.Command, function()
    TriggerServerEvent('nova-safety:server:requestHudToggle')
end, false)

RegisterNetEvent('nova-safety:client:setHudVisible', function(visible)
    setHudVisible(visible)
end)

RegisterNetEvent('nova-safety:client:refreshHud', function()
    local playerPed = PlayerPedId()
    if playerPed == 0 then
        return
    end

    local playerCoords = GetEntityCoords(playerPed)
    updateCurrentPlayerCoords(playerCoords)
    updateHud(playerCoords)
end)

RegisterNetEvent('nova-safety:client:setZones', function(zones)
    safetyZones = zones or {}

    local playerPed = PlayerPedId()
    if playerPed ~= 0 then
        local playerCoords = GetEntityCoords(playerPed)
        updateCurrentPlayerCoords(playerCoords)
        updateHud(playerCoords)
    end
end)

RegisterNetEvent('nova-safety:client:notify', function(message)
    showSafetyNotification(message)
    showUiNotification(message)
end)

RegisterNUICallback('addZone', function(data, cb)
    TriggerServerEvent('nova-safety:server:addZone', data)
    cb({ ok = true })
end)

CreateThread(function()
    while true do
        Wait(Config.RefreshIntervalMs)

        local playerPed = PlayerPedId()
        if playerPed ~= 0 then
            local playerCoords = GetEntityCoords(playerPed)
            updateCurrentPlayerCoords(playerCoords)
            updateHud(playerCoords)
        end
    end
end)

AddEventHandler('onClientResourceStart', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then
        return
    end

    TriggerServerEvent('nova-safety:server:requestHudState')
    TriggerServerEvent('nova-safety:server:requestSync')

    local playerPed = PlayerPedId()
    if playerPed ~= 0 then
        local playerCoords = GetEntityCoords(playerPed)
        updateCurrentPlayerCoords(playerCoords)
        updateHud(playerCoords)
    end
end)