'use strict'

const MODULE_NAME = 'config_utils';

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

    debug_logger('@config = ' + JSON.stringify(config));
    
    return config;
}




exports.get_config_from_environment = get_config_from_environment;