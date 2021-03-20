local checks = require('checks')
local bundle = require('graphqlide.bundle')
local front = require('frontend-core')

local VERSION = '0.0.9-1'
local ENDPOINT = nil

local function init(endpoint)
    checks('string')
    if bundle and front then
        ENDPOINT = endpoint or '/admin/api'
        front.set_variable('graphQLIDEPath', ENDPOINT)
        front.add('graphqlide', bundle)
    end
end

local function set_endpoint(endpoint)
    checks('string')
    front.set_variable('graphQLIDEPath', endpoint)
end

local function get_endpoint()
    return ENDPOINT
end

local function front_init(httpd, opts)
    checks('table', '?table')
    opts = opts or {}
    if front then
        local front_installed = false
        for _,v in pairs(httpd.routes) do
            if v.path:match('/static/:namespace/%*filename') then
                front_installed = true
            end
        end

        if (front_installed == false and opts.front_init == nil) or
           (opts and opts.front_init) then
            front.init(httpd, {
                enforce_root_redirect = opts.enforce_root_redirect,
                prefix = opts.prefix,
            })
        end
    end
end

return {
    init = init,
    front_init = front_init,
    set_endpoint = set_endpoint,
    get_endpoint = get_endpoint,
    VERSION = VERSION,
}
