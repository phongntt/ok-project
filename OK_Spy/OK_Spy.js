'use strict'

// FEDAULT CONFIG
var app_config = null;

const MAIN_CONF_FILE = './conf/conf.yml';
const controller = require('./controller.js');

function main_run() {
    app_config = controller.load_config(MAIN_CONF_FILE);
    console.log(app_config);
    
    controller.run();
}

main_run();