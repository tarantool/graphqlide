local t = require('luatest')
local g = t.group('graphqlide')

require('test.helper')

local function mock_argparse(params)
    package.loaded['cartridge.argparse'] = nil
    package.loaded['cartridge.argparse'] = {
        parse = function()
            return params
        end,
    }
end

g.test_reload = function()
    require('graphqlide')
    package.loaded['graphqlide'] = nil
    require('graphqlide')
    package.loaded['graphqlide'] = nil
    require('graphqlide')
    package.loaded['graphqlide'] = nil
end

g.test_init_stop = function()
    local graphqlide = require('graphqlide')
    graphqlide.init()
    graphqlide.stop()
    package.loaded['graphqlide'] = nil
    package.loaded['graphqlide.bundle'] = nil
end

g.test_front_init = function()
    local http = require('http.server')
    local graphqlide = require('graphqlide')

    local HOST = '0.0.0.0'
    local PORT = 18081

    local httpd = http.new(HOST, PORT,{ log_requests = false })

    httpd:start()
    graphqlide.front_init(httpd, {enforce_root_redirect = true, front_init = true})
    graphqlide.init()

    local http_client = require('http.client').new({max_connections = 5})
    local response = http_client:request('GET','http://localhost:'..tostring(PORT)..'/admin/graphqlide')

    t.assert_equals(response.status, 200)

    graphqlide.front_init(httpd)

    graphqlide.stop()
    httpd:stop()
    package.loaded['graphqlide'] = nil
    package.loaded['graphqlide.bundle'] = nil
    package.loaded['http.server'] = nil
    package.loaded['frontend-core'] = nil
    package.loaded['http.client'] = nil
end

g.test_endpoints = function()
    local graphqlide = require('graphqlide')
    graphqlide.set_endpoint({ name = 'Default', path = '/admin/graphql', default = true })
    t.assert_items_equals(graphqlide.get_endpoints(), {Default = {default = true, path = "admin/graphql"}})

    graphqlide.set_endpoint({ name = 'Admin', path = '/admin/api' })
    t.assert_items_equals(graphqlide.get_endpoints(), {
        Admin = {default = false, path = "admin/api"},
        Default = {default = true, path = "admin/graphql"},
    })

    graphqlide.set_endpoint({ name = 'Spaces', path = '/admin/graphql', default = true })
    t.assert_items_equals(graphqlide.get_endpoints(), {
        Admin = {default = false, path = "admin/api"},
        Default = {default = false, path = "admin/graphql"},
        Spaces = {default = true, path = "admin/graphql"},
    })

    graphqlide.remove_endpoint('Spaces')
    t.assert_items_equals(graphqlide.get_endpoints(), {
        Admin = {default = false, path = "admin/api"},
        Default = {default = false, path = "admin/graphql"},
    })

    local res = graphqlide.remove_endpoint('Spaces')

    t.assert_equals(res, false)
    t.assert_items_equals(graphqlide.get_endpoints(), {
        Admin = {default = false, path = "admin/api"},
        Default = {default = false, path = "admin/graphql"},
    })

    package.loaded['graphqlide'] = nil
    package.loaded['graphqlide.bundle'] = nil
end

g.test_set_default = function()
    local graphqlide = require('graphqlide')
    graphqlide.set_endpoint({ name = 'Admin', path = '/admin/api' })
    graphqlide.set_endpoint({ name = 'Spaces', path = '/admin/graphql', default = true })

    t.assert_equals(graphqlide.set_default('Admin'), true)
    t.assert_equals(graphqlide.get_endpoints()['Admin'].default, true)
    t.assert_equals(graphqlide.get_endpoints()['Spaces'].default, false)

    t.assert_equals(graphqlide.set_default('admin'), false)

    package.loaded['graphqlide'] = nil
end

g.test_add_remove_cartridge_api_endpoint = function()
    mock_argparse({ webui_prefix = '/custom/' })
    local graphqlide = require('graphqlide')

    graphqlide.add_cartridge_api_endpoint('Admin', true)

    t.assert_items_equals(graphqlide.get_endpoints(), {
        Admin = {
            default = true,
            options = { directiveIsRepeatable = false, specifiedByUrl = false },
            path = 'custom/admin/api'},
    })

    graphqlide.remove_cartridge_api_endpoint()
    t.assert_items_equals(graphqlide.get_endpoints(), {})

    package.loaded['graphqlide'] = nil
    package.loaded['cartridge.argparse'] = nil
end
