"use strict";

const async = require("async");


// DEFAULT CONFIG
var config = null;

const main_conf_file = './conf/conf.yml';
const controller = require('./controller.js');

function main_run() {
    config = controller.load_config_from_file(main_conf_file);
    
    async.waterfall(
        [async.apply(controller.init_by_conf, config)],
        (err, data) => {
            if(!config.is_init_err) {
                console.log('Init SUCCESS! Attacker STARTUP...');
                controller.do_config(config);
                //controller.run();
            }
            else {
                console.log('Init get ERROR! Attacker STOPED!');
            }
        }
    );
}

main_run();
