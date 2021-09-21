package.loaded['graphqlide.bundle'] = nil

local checks = require('checks')
local bundle = require('graphqlide.bundle')
local front = require('frontend-core')

local VERSION = '0.0.12-1'
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

return {
    init = init,
    stop = stop,
    front_init = front_init,
    set_endpoint = set_endpoint,
    get_endpoints = get_endpoints,
    remove_endpoint = remove_endpoint,
    VERSION = VERSION,
}
