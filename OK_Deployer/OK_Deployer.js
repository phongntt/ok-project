"use strict";

const async = require("async");


// DEFAULT CONFIG
var config = null;
var runtime_config = null;     // config user for only this app type
var zkClient = null; //hold ephemeral_node

////const main_conf_file = './conf/conf.yml';
const controller = require('./controller.js');

const config_utils = require('./utils/config_utils');


function store_configs(configs, callback) {
    const debug_logger = require('debug')('[MAIN.store_configs]');
    debug_logger('@all_config = ' + configs);
    zkClient = configs[2];
    runtime_config = configs[1];
    config = configs[0];
    
    debug_logger('@config = ' + JSON.stringify(config));
    debug_logger('@runtime_config = ' + JSON.stringify(runtime_config));
    
    // Set configs to controller - for this App
    controller.set_config(config, runtime_config);

    callback(null, configs);
}

function start_to_run(config, callback) {
    controller.run(callback);
}


function next_loop_run() {
    console.log('[MAIN.main_run] START NEW LOOP');

    async.waterfall(
        [controller.run],
        final_callback
    );
}

function final_callback(err, finalResult) {
    const debug_logger = require('debug')('[MAIN.final_callback]');
    if (err) {
        console.log('FATAL', 'Main run end with ERROR');
        debug_logger('ERROR =', err);
        config_utils.finalize_app(config, zkClient);
    }
    else {
        console.log('INFO', 'Main run end with SUCCESS');
        config_utils.loop_endding_process(config, runtime_config, zkClient, next_loop_run);
    }
}


function main_run() {
    console.log('[MAIN.main_run] START');

    async.waterfall(
        [
            config_utils.get_full_config_from_environment,
            store_configs,
            start_to_run
        ],
        final_callback
    );
}

//// Create ZK_NODE
////const zk_helper = require('./utils/zk_helper');
////zk_helper.zk_create_node_sure ('127.0.0.1', 2181, '/danko/attacker', () => {});

main_run();
