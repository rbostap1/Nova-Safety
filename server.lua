RegisterNetEvent('nova-safety:server:requestSync', function()
    TriggerClientEvent('nova-safety:client:refreshHud', source)
end)