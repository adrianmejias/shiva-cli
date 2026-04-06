return {
    up = function(DB)
        DB.execute([[
            -- TODO: Write your migration SQL
            --
            -- Example:
            -- CREATE TABLE IF NOT EXISTS `{{snake_name}}` (
            --     `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
            --     `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            --     `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            --     PRIMARY KEY (`id`)
            -- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ]])
    end,
}
