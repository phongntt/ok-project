/*************************************************************
 * Module: ok-project.OK_Utils.config_utils
 * Creator: Nguyen Tran Tuan Phong
 * Create date: 2016-11-18
 * Desc: Suppport functions that using for config tasks 
 ************************************************************/

'use strict';

const MODULE_NAME = 'config_utils';

const async = require("async");
const YAML = require('yamljs');
const zk_helper = require('./zk_helper');
const common_utils = require('./common_utils');



/**
 * Read configuration for OK_Apps from Environment-Variable
 */
function get_config_from_environment() {
    const debug_logger = require('debug')(MODULE_NAME + 'run_async_final');
    

    let config = {};
    
    // DEFAULT VALUES
    config.zk_server = {};
    config.zk_server.host = '127.0.0.1';
    config.zk_server.port = 2080; // Sleep 1 second
    config.zk_server.main_conf = '/danko/conf'; // Never expired
    config.zk_server.app_name = 'Noname'; // Never expired
    config.log_file = './logs/danko.log';
    config.pid_file = './pid.txt';

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

    //OK_LOGFILE
    if (process.env.OK_PID_FILE) {
        config.pid_file = process.env.OK_PID_FILE;
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
                callback(err);
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
    function gfcfe_create_pid_file(callback) {
        common_utils.create_pid_file(all_config[0].pid_file, callback);
    }
    
    function gfcfe_get_config_from_zk(config, callback) {
        get_runtime_config(
            config, 
            (err, config_arr) => {
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
        let nodePath = config.zk_server.main_conf_data.monitor + '/' + config.app_name;
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


exports.get_config_from_environment = get_config_from_environment;
exports.get_runtime_config = get_runtime_config;
exports.get_full_config_from_environment = get_full_config_from_environment;