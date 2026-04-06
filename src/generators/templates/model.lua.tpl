--- @class {{ModelName}}
--- Model: {{ModelName}}
--- Table: {{table_name}}
local {{ModelName}} = {}

local _table = '{{table_name}}'

--- Find a record by primary key.
--- @param id number
--- @return table|nil
function {{ModelName}}.find(id)
    return MySQL.single.await('SELECT * FROM `' .. _table .. '` WHERE `id` = ?', { id })
end

--- Retrieve all records.
--- @return table[]
function {{ModelName}}.all()
    return MySQL.query.await('SELECT * FROM `' .. _table .. '`', {}) or {}
end

--- Insert a new record.
--- @param data table
--- @return number  Inserted row ID
function {{ModelName}}.create(data)
    return MySQL.insert.await('INSERT INTO `' .. _table .. '` SET ?', { data })
end

--- Update an existing record.
--- @param id     number
--- @param data   table
--- @return number  Affected rows
function {{ModelName}}.update(id, data)
    return MySQL.update.await('UPDATE `' .. _table .. '` SET ? WHERE `id` = ?', { data, id })
end

--- Delete a record by primary key.
--- @param id number
--- @return boolean
function {{ModelName}}.delete(id)
    return MySQL.update.await('DELETE FROM `' .. _table .. '` WHERE `id` = ?', { id }) > 0
end

return {{ModelName}}
