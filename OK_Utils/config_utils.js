'use strict'

const MODULE_NAME = 'config_utils';

/**
 * Read configuration for OK_Apps from Environment-Variable
 */
function get_config_from_environment() {
    const debug_logger = require('debug')(MODULE_NAME + 'run_async_final');
    

    let config = {};
    
    // DEFAULT VALUES
    config.OK_ZK_HOST = '127.0.0.1';
    config.OK_ZK_PORT = 2080; // Sleep 1 second
    config.OK_ZK_DIRECTION_NODE = '/danko/conf'; // Never expired
    config.OK_ZK_APPNAME = 'Noname'; // Never expired
    config.OK_LOGFILE = './logs/danko.log';

    //OK_ZK_HOST
    if (process.env.OK_ZK_HOST) {
        config.OK_ZK_HOST = process.env.OK_ZK_HOST;
    }

    //OK_ZK_PORT
    if (process.env.OK_ZK_PORT) {
        config.OK_ZK_PORT = process.env.OK_ZK_PORT;
    }

    //OK_ZK_DIRECTION_NODE
    if (process.env.OK_ZK_DIRECTION_NODE) {
        config.OK_ZK_DIRECTION_NODE = process.env.OK_ZK_DIRECTION_NODE;
    }

    //OK_ZK_APPNAME
    if (process.env.OK_ZK_APPNAME) {
        config.OK_ZK_APPNAME = process.env.OK_ZK_APPNAME;
    }

    //OK_LOGFILE
    if (process.env.OK_LOGFILE) {
        config.OK_LOGFILE = process.env.OK_LOGFILE;
    }

    debug_logger('@config = ' + JSON.stringify(config));
    
    return config;
}




exports.get_config_from_environment = get_config_from_environment;