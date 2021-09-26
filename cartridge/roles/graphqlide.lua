package.loaded['graphqlide'] = nil

local checks = require('checks')
local argparse = require('cartridge.argparse')

local graphqlide = require('graphqlide')

local function get_webui_prefix()
    return argparse.parse().webui_prefix or ''
end

function graphqlide.add_cartridge_api_endpoint(name, default)
    checks('string', '?boolean')
    graphqlide.set_endpoint({
        name = name,
        path = get_webui_prefix()..'/admin/api',
        default = default,
        options = {
            specifiedByUrl = false,
            directiveIsRepeatable = false,
        }
    })
end

function graphqlide.remove_cartridge_api_endpoint()
    local endpoints = graphqlide.get_endpoints()
    local api_path = get_webui_prefix()..'/admin/api'
    for name in pairs(endpoints) do
        if endpoints[name].path == api_path then
            graphqlide.remove_endpoint(name)
        end
    end
end

local function init()
    graphqlide.init()
end

local function stop()
    graphqlide.stop()
end

return setmetatable({
    role_name = 'graphqlide',
    init = init,
    stop = stop,
    reloadable = true,
}, { __index = graphqlide })
