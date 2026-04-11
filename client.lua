local hudVisible = Config.DefaultHudVisible
local currentZoneName = 'None'
local currentZoneCoords = 'N/A'
local currentZoneRadius = 'N/A'
local safetyActive = false
local lastSafetyZoneName = nil

local function formatCoords(coords)
    return string.format('%.2f, %.2f, %.2f', coords.x, coords.y, coords.z)
end

local function showSafetyNotification(message)
    SetNotificationTextEntry('STRING')
    AddTextComponentString(message)
    DrawNotification(false, true)
end

local function getClosestZone(playerCoords)
    local closestZone = nil
    local closestDistance = nil

    for _, zone in ipairs(Config.Zones) do
        local distance = #(playerCoords - zone.coords)
        if distance <= zone.radius and (closestDistance == nil or distance < closestDistance) then
            closestZone = zone
            closestDistance = distance
        end
    end

    return closestZone
end

local function updateHud(playerCoords)
    local zone = getClosestZone(playerCoords)
    local zoneJustEntered = false

    if zone then
        currentZoneName = zone.name
        currentZoneCoords = formatCoords(zone.coords)
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
        currentZone = {
            name = currentZoneName,
            coords = currentZoneCoords,
            radius = currentZoneRadius,
            active = safetyActive
        },
        zones = Config.Zones,
        showRadius = Config.ShowZoneRadius
    })

    if zoneJustEntered then
        showSafetyNotification(string.format(
            'You have entered %s. This is a safety area. Violating roleplay is not to take place in or near these areas.',
            zone.name
        ))

        SendNUIMessage({
            action = 'zoneEntered',
            zoneName = zone.name,
            message = string.format(
                'You have entered %s. This is a safety area. Violating roleplay is not to take place in or near these areas.',
                zone.name
            )
        })
    end
end

RegisterCommand(Config.Command, function()
    hudVisible = not hudVisible
    SendNUIMessage({
        action = 'setVisible',
        visible = hudVisible
    })

    local playerPed = PlayerPedId()
    if playerPed ~= 0 then
        updateHud(GetEntityCoords(playerPed))
    end
end, false)

RegisterNetEvent('nova-safety:client:refreshHud', function()
    local playerPed = PlayerPedId()
    if playerPed == 0 then
        return
    end

    updateHud(GetEntityCoords(playerPed))
end)

CreateThread(function()
    while true do
        Wait(Config.RefreshIntervalMs)

        local playerPed = PlayerPedId()
        if playerPed ~= 0 then
            updateHud(GetEntityCoords(playerPed))
        end
    end
end)

AddEventHandler('onClientResourceStart', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then
        return
    end

    SendNUIMessage({
        action = 'setVisible',
        visible = hudVisible
    })

    local playerPed = PlayerPedId()
    if playerPed ~= 0 then
        updateHud(GetEntityCoords(playerPed))
    end
end)