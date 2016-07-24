"use strict";

const async = require("async");


// DEFAULT CONFIG
var config = null;

const main_conf_file = './conf/conf.yml';
const controller = require('./controller.js');

function add_env_var() {
/*
Add Environment Variables to config
*/
    config.host_ip = process.env.NODE_HOST_IP;
    
    if (process.env.NODE_OKATK_SLEEP_SEC) {
        config.sleep_seconds = process.env.NODE_OKATK_SLEEP_SEC;
    }
    else {
        config.sleep_seconds = 1;
    }
    
    config.job_expried_seconds = process.env.NODE_OKATK_JOB_EXP_TIME;
}

function main_run() {
    config = controller.load_config_from_file(main_conf_file);
    
    //Add Envirionment variable
    add_env_var();
    
    // INIT
    async.series(
        [
            async.apply(controller.init_by_conf, config),
            async.apply(controller.do_config, config),
        ],
        (err, data) => {
            if(err) {
                console.log('[MAIN.main_run] Init get ERROR! Attacker STOPED!');
            }
            else {
                console.log('[MAIN.main_run] Init SUCCESS! Attacker run!');
                //-------------------------------------
                controller.run();
                //-------------------------------------
            }
        }
    );
}

//// Create ZK_NODE
////const zk_helper = require('./utils/zk_helper');
////zk_helper.zk_create_node_sure ('127.0.0.1', 2181, '/danko/attacker', () => {});

main_run();
