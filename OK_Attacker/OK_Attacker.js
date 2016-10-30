"use strict";

const async = require("async");


// DEFAULT CONFIG
var config = null;
var runtime_config = null;     // config user for only this app type

////const main_conf_file = './conf/conf.yml';
const controller = require('./controller.js');

const config_utils = require('./utils/config_utils');


/**
 * Add Environment Variables into config
 */
function init_config(callback) {
    const debug_logger = require('debug')('OK_Attacker.init_config');

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
            async.apply(controller.init_by_conf),
            async.apply(controller.do_config),
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
