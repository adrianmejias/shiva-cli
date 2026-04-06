---@diagnostic disable: undefined-field, duplicate-set-field, need-check-nil
-- tests/{{test_name}}_spec.lua
-- Unit tests for {{describe_name}}.
-- Run with: shiva test --module {{module_name}}

local Spec = require('shiva-test.spec')

Spec.describe('{{describe_name}}', function(it, before, after)
    before(function()
        -- Stub globals used by {{describe_name}}
        Container = { resolve = function() end, bind = function() end }
        Config    = { get = function() end, register = function() end }
        Locale    = { t = function(_, key) return key end, register = function() end }
        EventBus  = { emit = function() end, on = function() end }
        DB        = { table = function() return DB end, execute = function() end }
        Log       = { info = function() end, debug = function() end, warn = function() end }
    end)

    it('passes a basic sanity check', function()
        Spec.assertTrue(true)
    end)

    -- it('should ...', function()
    --     Spec.assertEqual(actual, expected)
    -- end)
end)
