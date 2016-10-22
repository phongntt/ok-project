'use strict'

// FEDAULT CONFIG
var app_config = null;

// Comment: using confing from ENV_VAR
////const MAIN_CONF_FILE = './conf/conf.yml';
const controller = require('./controller.js');

function main_run() {
    // Comment: using confing from ENV_VAR
    ////app_config = controller.load_config(MAIN_CONF_FILE);
    app_config = controller.load_config();
    console.log(app_config);
    
    controller.run();
}

main_run();