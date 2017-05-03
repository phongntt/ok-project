"use strict";

const fs = require('fs');

// DEFAULT CONFIG
var config = null;

const controller = require('./controller.js');

/**********************
Add Environment Variables to config
***********************/
function add_env_var() {
    config = {};
    
    config.zk_server = {};
    config.zk_server.host = process.env.OK_ZK_SERVER_HOST;
    config.zk_server.port = process.env.OK_ZK_SERVER_PORT;
}

function read_nodes_data() {
    let conf_data = fs.readFileSync('./data/conf_data.yml','utf8');
    let headquater_data = fs.readFileSync('./data/headquater_data.yml','utf8');
    
    config.data = {};
    config.data.conf = conf_data;
    config.data.headquater = headquater_data;
}

function main_run() {
    add_env_var();
    read_nodes_data();
    
    controller.set_config(config);
    
    controller.run();
}

main_run();
