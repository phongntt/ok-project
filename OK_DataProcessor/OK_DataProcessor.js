'use strict'

// MODULES
const async = require("async");


// FEDAULT CONFIG
var config = null;
var runtime_config = null;

//// var main_conf_file = './conf/conf.yml';
var controller = require('./controller.js');
const config_utils = require('./utils/config_utils');

var zkClient = null;


/**
 * Add Environment Variables into config
 */
/**
function DEL_init_config(callback) {
    const debug_logger = require('debug')('OK_DataProcessor.init_config');

    function ic_config_process(err, data) {
        if(err) {
            debug_logger('ERROR: ' + err);
            callback(err);
        }
        else {
            config = data[0];
            runtime_config = data[1];
            
            debug_logger('@config = ' + JSON.stringify(config));
            debug_logger('@runtime_config = ' + JSON.stringify(runtime_config));
            
            // Transfer @config, @runtime_config to Controller
            controller.set_config(config, runtime_config);
            
            callback(null, data);
        }
    }
    
    config_utils.get_full_config_from_environment(ic_config_process);
}
*/


// Chuyen sang DEL_ ngay 2016-11-27
/**
function DEL_main_run() {
    console.log('[MAIN.main_run] START');

    async.series(
        [
            init_config,
            controller.init_by_conf
        ],
        (err, data) => {
            if(err) {
                console.log('[MAIN.main_run] Init get ERROR! DataProcessor STOPED!');
            }
            else {
                console.log('[MAIN.main_run] Init SUCCESS! DataProcessor run!');
                //-------------------------------------
                controller.run();
                //-------------------------------------
            }
        }
    );
}
*/

function main_run() {
    const debug_logger = require('debug')('[MAIN.main_run]');
    
    function mn_store_configs(configs, callback) {
        debug_logger('@all_config = ' + configs);
        zkClient = configs.pop();
        runtime_config = configs.pop();
        config = configs.pop();
        
        debug_logger('@config = ' + JSON.stringify(config));
        debug_logger('@runtime_config = ' + JSON.stringify(runtime_config));
        
        controller.set_config(config, runtime_config);

        callback(null, configs);
    }
    
    function mn__final_callback(err, finalResult) {
        if (err) {
            console.log('FATAL', 'Got ERROR when doing config.');
            debug_logger('ERROR =', err);
        }
        else {
            console.log('INFO', 'CONFIG SUCCESS');
            controller.run();
        }
    }
    
    
    console.log('[MAIN.main_run] START');

    async.waterfall(
        [
            config_utils.get_full_config_from_environment,
            mn_store_configs
        ],
        mn__final_callback
    );
}

main_run();
