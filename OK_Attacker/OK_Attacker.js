"use strict";

const async = require("async");


// DEFAULT CONFIG
var config = null;
var runtime_config = null;     // config user for only this app type
var zkClient = null; //hold ephemeral_node

////const main_conf_file = './conf/conf.yml';
const controller = require('./controller.js');

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

//// Create ZK_NODE
////const zk_helper = require('./utils/zk_helper');
////zk_helper.zk_create_node_sure ('127.0.0.1', 2181, '/danko/attacker', () => {});

main_run();
