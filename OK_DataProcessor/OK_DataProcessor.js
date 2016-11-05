'use strict'

// MODULES
const async = require("async");


// FEDAULT CONFIG
var config = null;
var runtime_config = null;

//// var main_conf_file = './conf/conf.yml';
var controller = require('./controller.js');
const config_utils = require('./utils/config_utils');


/**
 * Add Environment Variables into config
 */
function init_config(callback) {
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



function main_run() {
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

main_run();
