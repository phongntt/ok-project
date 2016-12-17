/*************************************************************
 * Module: ok-project.OK_Utils.config_utils
 * Creator: Nguyen Tran Tuan Phong
 * Create date: 2016-11-18
 * Desc: Suppport functions that using for config tasks 
 * 
 * Update History
 * - 2016-12-04: add finalize_app
 * - 2016-12-04: add loop_endding_process
 ************************************************************/

'use strict';

const MODULE_NAME = 'config_utils';

const fs = require('fs');
const async = require("async");
const YAML = require('yamljs');
const zk_helper = require('./zk_helper');
const common_utils = require('./common_utils');



/**
 * Read configuration for OK_Apps from Environment-Variable
 * 
 * History
 *   [2016-12-17]
 *   Add @config.stop_file
 */
function get_config_from_environment() {
    const debug_logger = require('debug')(MODULE_NAME + '.get_config_from_environment');
    

    let config = {};
    
    // DEFAULT VALUES
    config.zk_server = {};
    config.zk_server.host = '127.0.0.1';
    config.zk_server.port = 2080;
    config.zk_server.main_conf = '/danko/conf';
    config.zk_server.app_name = 'Noname';
    config.log_file = './logs/danko.log';
    config.pid_file = './pid.txt';
    config.stop_file = './stop.ok';

    //OK_ZK_HOST
    if (process.env.OK_ZK_HOST) {
        config.zk_server.host = process.env.OK_ZK_HOST;
    }

    //OK_ZK_PORT
    if (process.env.OK_ZK_PORT) {
        config.zk_server.port = process.env.OK_ZK_PORT;
    }

    //OK_ZK_MAIN_CONF
    if (process.env.OK_ZK_MAIN_CONF) {
        config.zk_server.main_conf = process.env.OK_ZK_MAIN_CONF;
    }

    //OK_ZK_APPNAME
    if (process.env.OK_ZK_APPNAME) {
        config.zk_server.app_name = process.env.OK_ZK_APPNAME;
    }

    //OK_LOGFILE
    if (process.env.OK_LOGFILE) {
        config.log_file = process.env.OK_LOGFILE;
    }

    //OK_PID_FILE
    if (process.env.OK_PID_FILE) {
        config.pid_file = process.env.OK_PID_FILE;
    }

    //OK_STOP_COMMAND_FILE
    if (process.env.OK_STOP_COMMAND_FILE) {
        config.stop_file = process.env.OK_STOP_COMMAND_FILE;
    }

    debug_logger('@config = ' + JSON.stringify(config));
    
    return config;
}


/**
 * Get @runtime_config for app.
 *   This config is got from ZK Server
 * @config: config that load from ENV or config_file
 * @callback: callback function (err, data)
 *   @data: [@main_conf_data, @runtime_config]
 */
function get_runtime_config(app_config, callback) {
// @ Async Compatible
    const debug_logger = require('debug')(MODULE_NAME + '.get_runtime_config');

    debug_logger('@app_config = ' + JSON.stringify(app_config));

    let host = app_config.zk_server.host;
    let port = app_config.zk_server.port;
    let main_conf_path = app_config.zk_server.main_conf;
    
    let return_data = [];
    
    
    function grc__get_runtime_config(main_conf_data_yaml, callback) {
        
        // 2. Get @config_path from data of step 1 --> @self_conf_path
        let app_name = app_config.zk_server.app_name;
        let main_conf = YAML.parse(main_conf_data_yaml);
        let self_conf_path = main_conf[app_name];
        
        // Save for later use
        return_data.push(main_conf);
        
        debug_logger('@self_conf_path = ' + JSON.stringify(self_conf_path));
        
        // 3. Read @runtime_config from @config_path
        zk_helper.zk_get_node_data(host, port, self_conf_path, callback);
    }
    
    async.waterfall([
            // Step 1
            async.apply(zk_helper.zk_get_node_data, host, port, main_conf_path),
            
            // Step 2, 3
            grc__get_runtime_config
            
            // Set to @runtime_config
            // lrcfzk__set_to_runtime_config
        ], 
        function (err, data) {
            if (err) {
                console.log('Cannot load runtime_config because of error: %s', err);
                callback(common_utils.create_error__config_from_ZK('Cannot load runtime_config from ZK'));
            }
            else {
                let runtime_config = YAML.parse(data);
                return_data.push(runtime_config);
                console.log('Runtime Config loaded:\n%s', YAML.stringify(runtime_config, 10));
                callback(null, return_data);
            }
        }
    );
}


/**
 * This function will do 2 step:
 *   1- Get @config from environment
 *   2- Create PID file
 *   3- Based on @config, get @runtime_config from ZK
 *   4- Creata Ephemeral node
 * 
 * Params:
 *   @callback: callback function (err, data)
 *     @data: = [@config, @runtime_config, @]
 */
function get_full_config_from_environment(callback) {
    const debug_logger = require('debug')(MODULE_NAME + '.get_full_config_from_environment');

    function gfcfe_create_pid_file(callback) {
        common_utils.create_pid_file(
            all_config[0].pid_file, 
            (err, is_file_created) => {
                if(err) {
                    callback(common_utils.create_error__PID_file('Cannot create PID file.')); //re-raise error
                }
                else {
                    callback(null, config); //for the next step
                }
            }
        );
    }
    
    function gfcfe_get_config_from_zk(config, callback) {
        get_runtime_config(
            config, 
            (err, config_arr) => {
                debug_logger('Config loaded from ZK');
                debug_logger(config_arr);
                
                if (err) {
                    callback(err);
                }
                else {
                    all_config[0].zk_server.main_conf_data = config_arr[0];
                    
                    all_config.push(config_arr[1]);
                    callback(null, all_config);
                }
            }
        );
    }
    
    function gfcfe_create_ephemeral_node(p_all_config, callback) {
        let config = p_all_config[0];
        let nodePath = config.zk_server.main_conf_data.monitor + '/' + config.zk_server.app_name;
        zk_helper.zk_create_client_with_ephemeral_node(
            config.zk_server.host,
            config.zk_server.port,
            nodePath,
            callback
        );
    }
    
    function finalCallback(err, zkClient) {
        all_config.push(zkClient);
        callback(err, all_config);
    }
    
    
    let all_config = [];
   
    // 1- Get @config from environment
    let config =  get_config_from_environment();
    all_config.push(config);
   
    async.waterfall(
        [
            // 2- Create PID file
            gfcfe_create_pid_file,
            
            // 3- Based on @config, get @runtime_config from ZK
            gfcfe_get_config_from_zk,
            
            // 4- Creata Ephemeral node
            gfcfe_create_ephemeral_node
        ],
        
        //final - push all out
        finalCallback
    );
}


/**
 * Final steps to stop app:
 *   1. Disconnect to ZK Server ---> remove ephemeral_node
 *   2. Delete PID file
 *   2. Delete STOP_COMMAND file
 * Params:
 *   @config & @runtime_config: the config, runtime_config of the app
 *   @zkClient: the ZK_Client to handle ephemeral node
 *   @callback: the callback function
 *
 * History:
 *   Created: 2016-12-04
 * 
 *   Update: 2016-12-17
 *   Desc: Add deleting STOP_COMMAND file
 */
function finalize_app(config, zkClient) {
    const debug_logger = require('debug')(MODULE_NAME + '.finalize_app');

    function lep__delete_alive_node(callback) {
        let alive_ephemeral_node_path = 
            config.zk_server.main_conf_data.monitor //monitor path
            + '/' + config.zk_server.app_name; // name of this app
        
        zkClient.remove(alive_ephemeral_node_path, (error) => {
            if (error) {
                debug_logger('Failed to remove ALIVE_NODE: %s due to: %s.', alive_ephemeral_node_path, error);
                ////callback(common_utils.create_error__finalize_ephemeral_node('Failed to remove ALIVE_NODE')); // ERROR
                callback(null, true); //ignore this error ---> node will be automatically remove if the connection is lost
            }
            else {
                debug_logger('ALIVE_NODE removed SUCCESS: %s', alive_ephemeral_node_path);
                callback(null, true); //SUCCESS
            }
        });
    }
    
    function lep__delete_stop_command_file(callback) {
        fs.unlink(config.stop_file, (err, result) => {
            if(err) {
                debug_logger('ERROR when delete STOP_COMMAND_FILE');
                debug_logger(err);
                callback(null, true); //just show and ignore the error
            }
            else {
                callback(null, result);
            }
        });
    }

    async.series(
        [
            lep__delete_alive_node, //Step 1
            async.apply(fs.unlink, config.pid_file), //Step 2
            lep__delete_stop_command_file //Step 3
        ],
        (err, result) => {
            if(err) {
                debug_logger('Finalize App get error: ' + err);
            }
            else {
                debug_logger('Finalize App SUCCESS');
                //zkClient.close();
            }
            
            zkClient.close(); //Close connection anyway
        }
    );
}


/**
 * Process at end of each loop
 * This function will check and set the app to run another loop or stop.
 * Params
 *   @config, @runtime_config, @zkClient: all app has these vars
 *   @next_loop_func: function to run at the next loop (if available)
 *
 * History:
 *   Created: 2016-12-04
 * 
 *   [2016-12-17] A checking for STOP_COMMAND file and stop app if STOP_COMMAND exists
 */
function loop_endding_process(config, runtime_config, zk_client, next_loop_func) {
    const debug_logger = require('debug')(MODULE_NAME + '.loop_endding_process');
    
    debug_logger('Checking and set next loop');
    
    // Kiem tra + dat loop time
    debug_logger('@runtime_config: ' + JSON.stringify(runtime_config));
    let sleepSec = parseInt(common_utils.if_null_then_default(runtime_config.sleep_seconds, 0), 10);
    debug_logger('SLEEP SECONDS: ' + sleepSec);
    
    // Check if STOP_COMMAND exists ---> assign sleepSec = 0 to stop app
    if (fs.existsSync(config.stop_file)) {
        debug_logger('STOP_COMMAND file exists ---> Will stop the app now.');
        sleepSec = 0; // to stopping this app
    } 

    // sleepSec never be null, read above
    if (sleepSec > 0) {
        setTimeout(next_loop_func, sleepSec * 1000);
        console.log('Next loop will be run at next %s second(s)', sleepSec);
        console.log("\n\n\n\n\n");
    }
    else {
        console.log('No loop will be run. Because, "sleep_seconds = 0"');
        
        debug_logger('FINALIZE THE APP');
        finalize_app(config, zk_client);
        /**
         * NEVER LOOP IMMEDIATELY!!
         * So I comment this
         * ----------------------------------------
        setTimeout(run, 0);
        console.log('Next loop will be run NOW!',
            parseInt(sleepSec));
         * ----------------------------------------
         * */
    }
}


exports.get_config_from_environment = get_config_from_environment;
exports.get_runtime_config = get_runtime_config;
exports.get_full_config_from_environment = get_full_config_from_environment;
exports.finalize_app = finalize_app;
exports.loop_endding_process = loop_endding_process;