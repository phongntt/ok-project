'use strict';


const async = require("async");


// DEFAULT CONFIG
var config = null;
var runtime_config = null;     // config user for only this app type
var zkClient = null; //hold ephemeral_node


// Comment: using confing from ENV_VAR
////const MAIN_CONF_FILE = './conf/conf.yml';
const controller = require('./controller.js');
const config_utils = require('./utils/config_utils');

const debug_logger = require('debug')('[MAIN.main_run]');

/**
 * Check and set the next loop
 * Params:
 *   @p_runtime_config: the @runtime_config
 */
function check_and_set_next_loop(p_runtime_config, functionToRun) {
    // Kiem tra + dat loop time
    if (p_runtime_config.sleep_seconds) {
        if(p_runtime_config.sleep_seconds > 0) {
            setTimeout(
                functionToRun, 
                parseInt(p_runtime_config.sleep_seconds, 10) * 1000
            );
            console.log('Next loop will be run at next %s second(s)', 
                    parseInt(p_runtime_config.sleep_seconds, 10));
            console.log("\n\n\n\n\n");
        }
    }
}



function store_configs(configs, callback) {
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

function start_to_run(configs, callback) {
    controller.run(callback);
}

function final_callback(err, finalResult) {
    if (err) {
        console.log('FATAL', 'MAIN_PROCESS Got ERROR.');
        debug_logger('ERROR =', err);
        config_utils.finalize_app(config, zkClient);
    }
    else {
        console.log('INFO', 'MAIN_PROCESS SUCCESS');
        
        ////check_and_set_next_loop(runtime_config, next_loop_run);
        debug_logger('@config = ' + JSON.stringify(config));
        config_utils.loop_endding_process(config, runtime_config, zkClient, next_loop_run);
    }
}

function next_loop_run() {
    console.log('[MAIN.main_run] START NEW LOOP');

    async.waterfall(
        [controller.run],
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