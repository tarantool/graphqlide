local graphqlide = require('graphqlide')

local function init()
    graphqlide.init()
end

local function stop()
    package.loaded['graphqlide.bundle'] = nil
end

local function set_endpoint(endpoint)
    graphqlide.set_endpoint(endpoint)
end

local function get_endpoint(endpoint)
    return graphqlide.get_endpoint()
end

return setmetatable({
    role_name = 'graphqlide',
    init = init,
    stop = stop,
    set_endpoint = set_endpoint,
    get_endpoint = get_endpoint,
    VERSION = graphqlide.VERSION
}, { __index = graphqlide })
