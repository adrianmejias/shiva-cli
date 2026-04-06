---@class {{ModelName}} : ModelClass
{{ModelName}} = Model.define('{{table_name}}')

---@param id integer
---@return table|nil
function {{ModelName}}.findById(id)
    return DB.table('{{table_name}}'):where('id', id):first()
end

-- TODO: Add custom query methods
-- Example:
-- function {{ModelName}}.findByField(value)
--     return DB.table('{{table_name}}'):where('field', value):get()
-- end
