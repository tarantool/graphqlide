package.loaded['graphqlide.bundle'] = nil

local argparse_ok, argparse = pcall(require, 'cartridge.argparse')
local checks = require('checks')
local bundle = require('graphqlide.bundle')
local front = require('frontend-core')

local VERSION = 'scm-1'
local ENDPOINTS = {}
local NAMESPACE = 'graphqlide'
local DEFAULT_FRONT_VARIABLE = 'graphQLIDEPath'

local function init()
    if bundle and front then
        front.add(NAMESPACE, bundle)
    end
end

local function stop()
    if front ~= nil then
        if type(front.remove) == 'function' then
            front.remove(NAMESPACE)
        end
        front.set_variable(DEFAULT_FRONT_VARIABLE, nil)
    end
end

local function set_endpoint(endpoint)
    checks({
        name = 'string',
        path = 'string',
        default = '?boolean',
        options = {
            descriptions = '?boolean',
            specifiedByUrl = '?boolean',
            directiveIsRepeatable = '?boolean',
            schemaDescription = '?boolean',
            inputValueDeprecation = '?boolean',
        },
    })

    if endpoint.default == true then
        for name in pairs(ENDPOINTS) do
            ENDPOINTS[name].default = false
        end
    end

    ENDPOINTS[endpoint.name] = {
        path = endpoint.path,
        default = endpoint.default or false,
        options = endpoint.options
    }

    front.set_variable(DEFAULT_FRONT_VARIABLE, ENDPOINTS)
end

local function get_endpoints()
    return ENDPOINTS
end

local function remove_endpoint(name)
    if ENDPOINTS[name] ~= nil then
        ENDPOINTS[name] = nil
        return true
    end
    return false
end

local function set_default(name)
    checks('string')
    if ENDPOINTS[name] ~= nil then
        for schema_name in pairs(ENDPOINTS) do
            ENDPOINTS[schema_name].default = false
        end
        ENDPOINTS[name].default = true
        return true
    end
    return false
end

local function is_front(httpd)
    checks('table')
    local front_installed = false
    if front ~= nil then
        for _,v in pairs(httpd.routes) do
            if v.path:match('/static/:namespace/%*filename') then
                front_installed = true
            end
        end
    end
    return front_installed
end

local function front_init(httpd, opts)
    checks('table', '?table')
    opts = opts or {}
    if (is_front(httpd) == false and opts.force_init == nil) or
        (opts and opts.force_init == true) then
        front.init(httpd, {
            enforce_root_redirect = opts.enforce_root_redirect,
            prefix = opts.prefix,
        })
    end
end

local function remove_side_slashes(path)
    if path:startswith('/') then
        path = path:sub(2)
    end
    if path:endswith('/') then
        path = path:sub(1, -2)
    end
    return path
end

local function get_cartridge_api_endpoint()
    local path = 'admin/api'
    local webui_prefix = argparse.parse().webui_prefix
    if webui_prefix ~= nil then
        webui_prefix = remove_side_slashes(webui_prefix)
        path = webui_prefix..'/'..path
    end
    return path
end

local function add_cartridge_api_endpoint(name, default)
    checks('string', '?boolean')

    set_endpoint({
        name = name,
        path = get_cartridge_api_endpoint(),
        default = default,
        options = {
            specifiedByUrl = false,
            directiveIsRepeatable = false,
        }
    })
end

local function remove_cartridge_api_endpoint()
    local endpoints = get_endpoints()
    local api_path = get_cartridge_api_endpoint()
    for name in pairs(endpoints) do
        if endpoints[name].path == api_path then
            remove_endpoint(name)
        end
    end
end

return {
    init = init,
    stop = stop,
    front_init = front_init,
    set_endpoint = set_endpoint,
    get_endpoints = get_endpoints,
    remove_endpoint = remove_endpoint,
    set_default = set_default,
    add_cartridge_api_endpoint = argparse_ok and add_cartridge_api_endpoint or nil,
    remove_cartridge_api_endpoint = argparse_ok and remove_cartridge_api_endpoint or nil,
    VERSION = VERSION,
}
