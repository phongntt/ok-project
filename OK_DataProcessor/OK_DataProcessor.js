'use strict';

// MODULES
const async = require("async");


// FEDAULT CONFIG
var config = null;
var runtime_config = null;
var zkClient = null; //hold ephemeral_node

//// var main_conf_file = './conf/conf.yml';
var controller = require('./controller.js');
const config_utils = require('./utils/config_utils');


function store_configs(configs, callback) {
    const debug_logger = require('debug')('[MAIN.store_configs]');
    
    debug_logger('@all_config = ' + configs);
    zkClient = configs.pop();
    runtime_config = configs.pop();
    config = configs.pop();
    
    debug_logger('@config = ' + JSON.stringify(config));
    debug_logger('@runtime_config = ' + JSON.stringify(runtime_config));
    
    // Set configs to controller - for this App
    controller.set_config(config, runtime_config);

    callback(null, configs);
}

function final_callback(err, finalResult) {
    const debug_logger = require('debug')('[MAIN.final_callback]');
    
    if (err) {
        console.log('FATAL', 'MAIN GET ERROR ---> STOP.');
        debug_logger('ERROR =', err);
        config_utils.finalize_app(config, zkClient);
    }
    else {
        console.log('INFO', 'MAIN RUN SUCCESS');
        config_utils.loop_endding_process(config, runtime_config, zkClient, next_loop_run);
    }
}

function start_to_run(configs, callback) {
    controller.run(callback);
}

function next_loop_run() {
    console.log('[MAIN.main_run] START NEW LOOP');

    async.waterfall(
        [ controller.run ],
        final_callback
    );
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
