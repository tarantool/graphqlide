package.loaded['graphqlide.bundle'] = nil

local checks = require('checks')
local bundle = require('graphqlide.bundle')
local front = require('frontend-core')

local VERSION = '0.0.9-1'
local ENDPOINT = nil

local function init()
    if bundle and front then
        ENDPOINT = '/admin/api'
        front.add('graphqlide', bundle)
    end
end

local function stop()
end

local function set_endpoint(endpoint)
    checks('string')
    front.set_variable('graphQLIDEPath', endpoint)
end

local function get_endpoint()
    return ENDPOINT
end

return {
    role_name = 'graphqlide',
    init = init,
    stop = stop,
    set_endpoint = set_endpoint,
    get_endpoint = get_endpoint,
    VERSION = VERSION,
}
