'use strict'

const zk_helper = require('./utils/zk_helper');

var config = null;

function set_config(conf) {
    config = conf;
}

function set_data(path, data) {
    zk_helper.zk_set_node_data(config.zk.host, config.zk.port, path, data, (err, result) => {
        if (err) {
            console.log('[controller.set_data]', 'ERR', err);
        }
        else {
            console.log('[controller.set_data]', 'SUCCESS', 'data=', data);
        }
    })
    
    console.log(config.zk.host);
}

exports.set_config = set_config;
exports.set_data = set_data;
