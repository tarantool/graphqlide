local fio = require('fio')
local t = require('luatest')

local helper = table.copy(require('cartridge.test-helpers'))

helper.project_root = fio.dirname(debug.sourcedir())
helper.datadir = fio.pathjoin(helper.project_root, 'tmp', 'unit_test')

function helper.entrypoint(name)
    local path = fio.pathjoin(
        helper.project_root,
        'test',
        'entrypoint',
        string.format('%s.lua', name)
    )
    if not fio.path.exists(path) then
        error(path .. ': no such entrypoint', 2)
    end
    return path
end

helper.cluster_config = {
    server_command = helper.entrypoint('basic_srv'),
    datadir = fio.pathjoin(helper.project_root, 'tmp', 'db_test'),
    use_vshard = true,
    replicasets = {
        {
            alias = 'api',
            uuid = helper.uuid('a'),
            roles = {
                'vshard-router',
                'graphqlapi',
                'app.roles.api',
            },
            servers = {
                {
                    instance_uuid = helper.uuid('a', 1),
                    alias = 'router',
                    advertise_port = 13301,
                    http_port = 8281,
                },
            },
        },
        {
            alias = 'storage-1',
            uuid = helper.uuid('b'),
            roles = {
                'vshard-storage',
                'app.roles.storage'
            },
            servers = {
                {
                    instance_uuid = helper.uuid('b', 1),
                    alias = 'storage-1-master',
                    advertise_port = 13302,
                    http_port = 8282,
                },
                {
                    instance_uuid = helper.uuid('b', 2),
                    alias = 'storage-1-replica',
                    advertise_port = 13303,
                    http_port = 8283,
                },
            },
        },
        {
            alias = 'storage-2',
            uuid = helper.uuid('c'),
            roles = {
                'vshard-storage',
                'app.roles.storage'
            },
            servers = {
                {
                    instance_uuid = helper.uuid('c', 1),
                    alias = 'storage-2-master',
                    advertise_port = 13304,
                    http_port = 8284
                },
                {
                    instance_uuid = helper.uuid('c', 2),
                    alias = 'storage-2-replica',
                    advertise_port = 13305,
                    http_port = 8285
                },
            },
        },
    },
}

t.before_suite(function()
    fio.rmtree(helper.datadir)
    fio.mktree(helper.datadir)
    box.cfg({
        memtx_dir = helper.datadir,
        wal_dir = helper.datadir
    })
end)

return helper
