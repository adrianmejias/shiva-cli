---@diagnostic disable: undefined-field, duplicate-set-field, need-check-nil
-- tests/{{test_name}}_spec.lua
-- Unit tests for {{describe_name}}.
-- Run with: shiva test --module {{module_name}}

-- Resolve shiva-test relative to this file (both modules live in the same [category] folder)
package.path = '../../shiva-test/?.lua;../../shiva-test/?/init.lua;' .. package.path

local Test = require('src.init')

Test.setup({ mode = 'server' })

local describe   = Test.describe
local it         = Test.it
local expect     = Test.expect
local beforeEach = Test.beforeEach

describe('{{describe_name}}', function()
    beforeEach(function()
        -- Stub Shiva globals used by {{describe_name}}
        Container = { resolve = function() end, bind = function() end }
        Config    = { get = function() end, register = function() end }
        Locale    = { t = function(_, key) return key end, register = function() end }
        EventBus  = { emit = function() end, on = function() end }
        DB        = { table = function() return DB end, execute = function() end }
        Log       = { info = function() end, debug = function() end, warn = function() end }
    end)

    it('passes a basic sanity check', function()
        expect(true):toBeTrue()
    end)

    -- it('should ...', function()
    --     local actual = ...
    --     expect(actual):toBe(expected)
    -- end)
end)

Test.run()
