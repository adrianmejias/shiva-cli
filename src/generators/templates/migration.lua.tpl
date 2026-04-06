--- Migration: {{migration_name}}
--- Module:    {{module_name}}
--- Created:   {{created_at}}
return {
    up = function(db)
        db.execute([[
            -- TODO: Write your migration SQL
            --
            -- Example — create table:
            -- CREATE TABLE IF NOT EXISTS `{{snake_name}}` (
            --     `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            --     `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            --     `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            -- )
        ]])
    end,

    down = function(db)
        -- TODO: Write the rollback SQL
        -- Example:
        -- db.execute('DROP TABLE IF EXISTS `{{snake_name}}`')
    end,
}
