'use strict'

//const ZK_NODE_CONF = '/danko/conf';

const zk_helper = require('./utils/zk_helper');
const config_utils = require('./utils/config_utils');
const async = require("async");

const main_conf_file = './conf/conf.yml';


const bodyParser = require('body-parser');
var express=require('express');
var YAML=require('yamljs');

var app=express();
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// CONFIG OF THIS APP
var config = null;
var runtime_config = null;


function start_the_web() {
    if(config) {
    
        app.config = config;
        app.runtime_config = runtime_config;
        
        
        require('./router/main')(app);
        
        
        app.use('/client', express.static(__dirname + '/ember_client'));
        
        //app.engine('html', require('ejs').renderFile);
        
        var server=app.listen(process.env.PORT, process.env.IP, function(){
        	console.log("Express is running on port " + process.env.PORT);
        });
    
    }
}


function load_config_and_run(filename) {
    const debug_logger = require('debug')('server.load_config');
    
    /****
     * PhongNTT - 2016-10-22 - Not use. Because, conf now read from ENV_VAR
     * 
    function load_config__read_from_file(callback) {
        console.log('Load config from file:', filename);
        config = YAML.load(filename);
        debug_logger('@config =' + JSON.stringify(config));
        callback(null, config);
    }
    ***/
    
    function load_config__read_from_env(callback) {
        config = config_utils.get_config_from_environment();
        debug_logger('@config from ENV_VAR: ' + JSON.stringify(config));
        callback(null, config);
    }
    
    function load_config__read_zk_conf(p_config, callback) {
        function process_conf_data(err, data) {
            if(err) {
                debug_logger('Cannot read main config from ZK. ERROR:', err);
                callback(true); //ERROR
            }
            else {
                config.zk_server.main_conf_data = YAML.parse(data);
                debug_logger('config = ' + JSON.stringify(config));
                callback(null, config);
            }
        }
        
        zk_helper.zk_get_node_data(p_config.zk_server.host, p_config.zk_server.port, 
            p_config.zk_server.main_conf, process_conf_data);
    }
    
    function load_config__read_zk_conf_headquater(p_config, callback) {
        function process_hq_conf_data(err, data) {
            if(err) {
                debug_logger('Cannot read OK_HeadQuater config from ZK. ERROR:', err);
                callback(true); //ERROR
            }
            else {
                runtime_config = YAML.parse(data);
                debug_logger('config = ' + JSON.stringify(config));
                callback(null, config);
            }
        }
        
        let app_conf_path = p_config.zk_server.main_conf_data[p_config.zk_server.app_name];
        
        zk_helper.zk_get_node_data(p_config.zk_server.host, p_config.zk_server.port, 
            app_conf_path, process_hq_conf_data);
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
            load_config__read_from_env,
            load_config__read_zk_conf,
            load_config__read_zk_conf_headquater
        ],
        load_config__final_callback
    );
}






load_config_and_run(main_conf_file);