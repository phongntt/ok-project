'use strict'

// FEDAULT CONFIG
var config = null;

const MAIN_CONF_FILE = './conf/conf.yml';
const controller = require('./controller.js');

function main_run() {
    config = controller.load_config(MAIN_CONF_FILE);
    console.log(config);
    
    controller.run();
}

main_run();