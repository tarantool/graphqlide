local checks = require('checks')
local bundle = require('graphqlide.bundle')
local front = require('frontend-core')

local VERSION = '0.0.8-1'
local ENDPOINT = nil

local function init(endpoint)
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

return {
    init = init,
    bundle = bundle,
    set_endpoint = set_endpoint,
    get_endpoint = get_endpoint,
    VERSION = VERSION,
}
