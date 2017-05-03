'use strict'

const async = require("async");
const zk_helper = require('./utils/zk_helper');

var config = null;

function set_config(conf) {
    config = conf;
}


function run() {
    console.log('---- Controller.run ----');

    async.series(
        [
            async.apply(
                zk_helper.zk_create_node_sure, 
                config.zk_server.host,
                config.zk_server.port, 
                '/danko'),
            async.apply(
                zk_helper.zk_create_node_sure, 
                config.zk_server.host,
                config.zk_server.port, 
                '/danko/monitor'),
            async.apply(
                zk_helper.zk_create_node_sure, 
                config.zk_server.host,
                config.zk_server.port, 
                '/danko/spy_reports'),
            async.apply(
                zk_helper.zk_create_node_sure, 
                config.zk_server.host,
                config.zk_server.port, 
                '/danko/app_status'),
            async.apply(
                zk_helper.zk_create_node_sure, 
                config.zk_server.host,
                config.zk_server.port, 
                '/danko/app_info'),
            async.apply(
                zk_helper.zk_create_node_sure, 
                config.zk_server.host,
                config.zk_server.port, 
                '/danko/conf'),
            async.apply(
                zk_helper.zk_create_node_sure, 
                config.zk_server.host,
                config.zk_server.port, 
                '/danko/conf/headquater'),
            
            // SET DATA
            async.apply(
                zk_helper.zk_set_node_data, 
                config.zk_server.host,
                config.zk_server.port, 
                '/danko/conf',
                config.data.conf),
            async.apply(
                zk_helper.zk_set_node_data, 
                config.zk_server.host,
                config.zk_server.port, 
                '/danko/conf/headquater',
                config.data.headquater)
        ],
        (err, data) => {
            if (err) {
                console.log('Finish with ERR: ');
                console.log(err);
            }
            else {
                console.log('Finish Success');
                console.log('Data:');
                console.log(data);
            }
        }
    );
}

exports.set_config = set_config;
exports.run = run;
