"use strict";

// DEFAULT CONFIG
var config = null;

const controller = require('./controller.js');

function add_env_var() {
/*
Add Environment Variables to config
*/
    config = {};
    
    config.zk = {};
    config.zk.host = process.env.NODE_OK_ZK_CLI_ZK_HOST;
    config.zk.port = process.env.NODE_OK_ZK_CLI_ZK_PORT;
}

function main_run() {
    add_env_var();
    
    controller.set_config(config);
    
    let data = `app_conf_path: '/danko/conf'
app_result_path: '/danko/result'
app_status_path: '/danko/app_status'
app_info_path: '/danko/app_info'
attacker_path_prefix: '/danko/attacker'
job_name_seperator: '__'`;
    
    controller.set_data('/danko/conf/headquater', data);
}

main_run();
