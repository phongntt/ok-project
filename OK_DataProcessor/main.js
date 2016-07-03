// FEDAULT CONFIG
var config = null;

var main_conf_file = './conf/conf.yml';
var controller = require('./controller.js');

function main_run() {
    config = controller.load_config(main_conf_file);

    controller.run();
}

main_run();
