local bundle = require('graphqlide.bundle')
local front = require('frontend-core')

local function init()
    if bundle and front then
        front.add('graphqlide', bundle)
    end
end

return {
    init = init
}

