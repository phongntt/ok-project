'use strict'

// MODULES
const async = require("async");


// FEDAULT CONFIG
var config = null;
var runtime_config = null;
var zkClient = null; //hold ephemeral_node

//// var main_conf_file = './conf/conf.yml';
var controller = require('./controller.js');
const config_utils = require('./utils/config_utils');


function main_run() {
    const debug_logger = require('debug')('[MAIN.main_run]');
    
    function mn_store_configs(configs, callback) {
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
