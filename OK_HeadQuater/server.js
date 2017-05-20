'use strict';

//const ZK_NODE_CONF = '/danko/conf';

const config_utils = require('./utils/config_utils');
const async = require("async");

const bodyParser = require('body-parser');
var express=require('express');
var YAML=require('yamljs');

var app=express();
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// CONFIG OF THIS APP
var config = null;
var runtime_config = null;
var zkClient = null;

var server = null;

function start_the_web() {
    if(config) {
    
        app.config = config;
        app.runtime_config = runtime_config;
        
        
        require('./router/main')(app);
        
        
        app.use('/client', express.static(__dirname + '/ember_client'));
        
        //app.engine('html', require('ejs').renderFile);
        
        server=app.listen(process.env.PORT, process.env.IP, function(){
        	console.log("Express is running on port " + process.env.PORT);
        });
    
    }
}


function load_config_and_run() {
    const debug_logger = require('debug')('server.load_config_and_run');
    
    function get_full_config_from_environment (callback) {
        config_utils.get_full_config_from_environment(
            (err, allConfig) => {
                if (err) {
                    debug_logger('ERROR when load config from ZK');
                    debug_logger('@err = ' + JSON.stringify(err));
                    ////debug_logger('@all_config = ' + JSON.stringify(allConfig));
                    
                    // If cannot read node data or create monitor_node --> continue running
                    if(err.code == '0003' || err.code == '1003') {
                        callback(null, allConfig);
                    }
                    else {
                        callback(err);
                    }
                }
                else {
                    callback(null, allConfig);
                }
            }
        );
    }
    
    function lc_store_configs(configs, callback) {
        debug_logger('@all_config = ' + configs);
        zkClient = configs.zk_client;
        runtime_config = configs.runtime_conf;
        config = configs.env_config;
        
        debug_logger('@config = ' + JSON.stringify(config));
        debug_logger('@runtime_config = ' + JSON.stringify(runtime_config));

        callback(null, configs);
    }
    
    function load_config__final_callback(err, finalResult) {
        if (err) {
            console.log('FATAL', 'Got ERROR when doing config.');
            debug_logger('ERROR =', err);
        }
        else {
            console.log('INFO', 'CONFIG SUCCESS');
            start_the_web();
        }
    }
    
    
    async.waterfall(
        [
            //config_utils.get_full_config_from_environment,
            get_full_config_from_environment,
            lc_store_configs
        ],
        load_config__final_callback
    );
}


function final_the_server() {
    console.log('Server will Stop now!!');
    
    server.close();
    
    config_utils.finalize_app(config, zkClient);
}


process.on('SIGTERM', final_the_server);
process.on('SIGINT', final_the_server);
//process.on('SIGKILL', final_the_server);
//process.on('exit', final_the_server);


load_config_and_run();