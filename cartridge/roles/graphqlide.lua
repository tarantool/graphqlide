local graphqlide = require('graphqlide')

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
