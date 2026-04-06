--- {{module_name}} — Server Entry Point

local {{PascalName}} = {}

--- Initialize the server module
function {{PascalName}}:init()
    -- TODO: Server initialization
    print(('[^2{{module_name}}^7] Server initialized'))
end

AddEventHandler('onResourceStart', function(resourceName)
    if GetCurrentResourceName() ~= resourceName then return end
    {{PascalName}}:init()
end)
