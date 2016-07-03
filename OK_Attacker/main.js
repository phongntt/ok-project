"use strict";

const async = require("async");


// DEFAULT CONFIG
var config = null;

const main_conf_file = './conf/conf.yml';
const controller = require('./controller.js');

function main_run() {
    config = controller.load_config_from_file(main_conf_file);
    
    async.waterfall(
        [
            async.apply(controller.init_by_conf, config),
            async.apply(controller.do_config,config)
            ////sync.apply(controller.run) //Finish this
        ],
        (err, data) => {
            if(err) {
                console.log('[MAIN.main_run] Init get ERROR! Attacker STOPED!');
            }
            else {
                console.log('[MAIN.main_run] Init SUCCESS! Attacker run!');
            }
        }
    );
}

main_run();
