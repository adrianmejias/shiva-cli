--- {{module_name}} — Client Entry Point

local {{PascalName}} = {}

--- Initialize the client module
function {{PascalName}}:init()
    -- TODO: Client initialization
    print(('[^2{{module_name}}^7] Client initialized'))
end

AddEventHandler('onClientResourceStart', function(resourceName)
    if GetCurrentResourceName() ~= resourceName then return end
    {{PascalName}}:init()
end)
