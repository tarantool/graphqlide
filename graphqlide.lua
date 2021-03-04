local bundle = require('graphqlide.bundle')
local front = require('frontend-core')

local function init(path)
    if bundle and front then
        front.set_variable('graphqlidePath', path or '/admin/api')
        front.add('graphqlide', bundle)
    end
end

return {
    init = init,
    bundle = bundle
}

