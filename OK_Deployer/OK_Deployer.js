"use strict";

const async = require("async");


// DEFAULT CONFIG
var config = null;
var runtime_config = null;     // config user for only this app type
var zkClient = null; //hold ephemeral_node

////const main_conf_file = './conf/conf.yml';
const controller = require('./controller.js');

const config_utils = require('./utils/config_utils');


/**
 * Storing the config into vars
 * 
 * Params:
 *   @configs: an array storing the configs.
 *     This array the result of function "config_utils.get_full_config_from_environment",
 *       return in callback function.
 *     Contains:
 *     @configs[0]: Config for this app
 *     @configs[1]: Runtime config
 *     @configs[2]: ZK Client
 */
function store_configs(configs, callback) {
    const debug_logger = require('debug')('[MAIN.store_configs]');
    debug_logger('@all_config = ' + configs);
    zkClient = configs.zk_client;
    runtime_config = configs.runtime_conf;
    config = configs.env_config;
    
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

main_run();