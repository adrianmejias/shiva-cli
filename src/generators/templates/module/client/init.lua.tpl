-- Request initial state from server when character is ready.
EventBus.on('player:characterReady', function()
    -- TriggerServerEvent('{{module_short}}:requestState')
end)
Log.info('[{{module_short}}] Client ready.')
