"use strict";

// Node Module
const async = require("async");
const YAML = require('yamljs');
const zookeeper = require('node-zookeeper-client');
const fs = require('fs');

// OK_Project Module
const common_utils = require('./utils/common_utils');
const config_utils = require('./utils/config_utils');
const zk_helper = require('./utils/zk_helper');

const MODULE_NAME = 'controller';

// Command to update server info
const STR_UPDATE_SERVER_INFO = 'UPDATE_SERVER_INFO';
//// TODO: chuyen cai nay len main_conf tren ZK

const MODNAME_CONTROLER_PATH = './ok_modules/';

const MAPNAME_ATTACKER_JOB_NAME_SEPERATOR = 'attacker_job_name_seperator'
const MAPNAME_ATTACKER_JOB_PATH = 'attacker_job_path';
const MAPNAME_MONITOR_PATH = 'monitor';
const MAPNAME_HOST_IP = 'host_ip';
const MAPNAME_ATTACKER_RUNNING_JOB_PATH = 'attacker_running_job_path';
const MAPNAME_ATTACKER_FAIL_JOB_PATH = 'attacker_fail_job_path';
const MAPNAME_ATTACKER_SUCSESS_JOB_PATH = 'attacker_succes_job_path';

/*---------------------------------------------------------------------
##     ##    ###    ########  
##     ##   ## ##   ##     ## 
##     ##  ##   ##  ##     ## 
##     ## ##     ## ########  
 ##   ##  ######### ##   ##   
  ## ##   ##     ## ##    ##  
   ###    ##     ## ##     ##  
---------------------------------------------------------------------*/

/*
var config = {
    zk_server: {
        host: '127.0.0.1',
        port: 2181
    },
    log_file: './logs/danko.log'
};
*/

var config = {};
    
var runtime_config = {};

var glob_vars = null;

// ZK_Path using to receive JOB of this Attacker
var job_queue_path = null;

// ZK_Ephemeral_node to notice that this app is alive
var alive_ephemeral_node_path = '/danko/monitor/attacker_noname'; //default value

var job_name_seperator = '__'; //default value

var running_job_path = '/danko/attacker/running_jobs'; //default value
var fail_job_path = '/danko/attacker/fail_jobs'; //default value
var success_job_path = '/danko/attacker/success_jobs'; //default value

var run_result = null;
var depended_app_status = null;

var app_zkClient = null; // to keep an ephemeral node

/* CONSTANT */
var ModFunctionType = {
    ReturnValue: 'return_value',
    Callback: 'callback'
}
var TaskType = {
    Serial: 'serial_group',
    Parallel: 'parallel_group'
}

/*---------------------------------------------------------------------
######## ##     ## ##    ##  ######  ######## ####  #######  ##    ##  ######  
##       ##     ## ###   ## ##    ##    ##     ##  ##     ## ###   ## ##    ## 
##       ##     ## ####  ## ##          ##     ##  ##     ## ####  ## ##       
######   ##     ## ## ## ## ##          ##     ##  ##     ## ## ## ##  ######  
##       ##     ## ##  #### ##          ##     ##  ##     ## ##  ####       ## 
##       ##     ## ##   ### ##    ##    ##     ##  ##     ## ##   ### ##    ## 
##        #######  ##    ##  ######     ##    ####  #######  ##    ##  ######  
---------------------------------------------------------------------*/

/*
 _                    _    ____             __ _       
| |    ___   __ _  __| |  / ___|___  _ __  / _(_) __ _ 
| |   / _ \ / _` |/ _` | | |   / _ \| '_ \| |_| |/ _` |
| |__| (_) | (_| | (_| | | |__| (_) | | | |  _| | (_| |
|_____\___/ \__,_|\__,_|  \____\___/|_| |_|_| |_|\__, |
                                                 |___/ 
===========================================
*/
function set_config(p_config, p_runtime_config) {
    const debug_logger = require('debug')(MODULE_NAME + '.set_config');
    
    config = p_config;
    runtime_config = p_runtime_config;
    
    init_global_vars();
}


// Init global variable for this app
function init_global_vars() {
    job_queue_path = config.zk_server.main_conf_data[MAPNAME_ATTACKER_JOB_PATH] //job_path
        + '/' + runtime_config[MAPNAME_HOST_IP] ; // Jobs for this attacker (by host IP)
    
    alive_ephemeral_node_path = config.zk_server.main_conf_data[MAPNAME_MONITOR_PATH] //monitor path
        + '/' + config.app_name; // name of this app
    
    job_name_seperator = config.zk_server.main_conf_data[MAPNAME_ATTACKER_JOB_NAME_SEPERATOR];

    // Job Paths
    running_job_path = config.zk_server.main_conf_data[MAPNAME_ATTACKER_RUNNING_JOB_PATH];
    fail_job_path = config.zk_server.main_conf_data[MAPNAME_ATTACKER_FAIL_JOB_PATH];
    success_job_path = config.zk_server.main_conf_data[MAPNAME_ATTACKER_SUCSESS_JOB_PATH];
}


function init_by_conf(callback) {
    const debug_logger = require('debug')(MODULE_NAME + '.init_by_conf');
    
    const mkdirp = require('mkdirp');
    const path = require('path');

    const selfname = '[' + MODULE_NAME + '.init_by_conf] ';
    
    async.series(
        [
            // Create log directory if not exists
            (callback) => {
                let log_path = path.dirname(config.log_file);
                mkdirp(log_path,
                    (err, data) => {
                        if (err) {
                            console.log(selfname + 'Create dir fail: ' + JSON.stringify(err));
                            callback(true); //ERR
                        }
                        else {
                            console.log(selfname + 'Create dir success');
                            callback(null, true); //SUCCESS
                        }
                    }
                );
            },
            zk_create_client,
            // Create alive node
            create_alive_node,
            // Create command queue
            async.apply(
                zk_helper.zk_create_node_sure,
                config.zk_server.host,
                config.zk_server.port,
                job_queue_path
            )
            
            /* PhongNTT - Commented - 2016-09-29
             * Desc: OK_HeadQuater will create RUNNING_JOBS_NODE
             * -------------------------------------------------
            ,
            async.apply(
                zk_helper.zk_create_node_sure,
                p_config.zk_server.host,
                p_config.zk_server.port,
                RUNNING_JOB_PATH
            )
             * -------------------------------------------------
             */
        ],
        (err, result) => {
            debug_logger('Init result: ' + result);
            
            if (err) {
                console.log('[init_by_conf] INIT FASLE');
                console.log('err = ' + JSON.stringify(err));
                callback(true); // ERR
            }
            else {
                console.log('[init_by_conf] INIT SUCCESS');
                callback(null, true); //SUCCESS
            }
        }
    );
}


function parse_job_info(job_str) {
    let jobInfo = {};
    
    let jobParts = job_str.split(job_name_seperator);
    
    jobInfo.job_full_name = job_str;
    jobInfo.created_epoch = jobParts[0];
    jobInfo.app_name = jobParts[1];
    jobInfo.command = jobParts[2];
    return jobInfo;
}


function zk_create_client(callback) {
    const timeout_second = 5;
    const selfname = '[' + MODULE_NAME + '.zk_create_client] ';

    app_zkClient = zookeeper.createClient(config.zk_server.host + ':' + config.zk_server.port);

    let timer = null;

    app_zkClient.once('connected', function() {
        // Xoa time-out check
        if (timer) {
            clearTimeout(timer);
        }
        callback(null, app_zkClient);
        // Log when connect SUCCESS
        console.log(selfname, 'Create ZK-Client Connected to Server.');
    });

    timer = setTimeout(() => {
        console.log(selfname + 'TimeOut - Current state is: %s', app_zkClient.getState());
        app_zkClient.close();
        callback('Timeout when calling to ZK-Server.'); //ERR
    }, timeout_second * 1000);

    app_zkClient.connect();
}


/**
 * Create a Node to let other know that this process is alive.
 */
function create_alive_node(callback) {
    const selfname = '[' + MODULE_NAME + '.create_alive_node] ';

    app_zkClient.create(alive_ephemeral_node_path, zookeeper.CreateMode.EPHEMERAL, (error) => {
        if (error) {
            console.log(selfname + 'Failed to create ALIVE_NODE: %s due to: %s.', alive_ephemeral_node_path, error);
            callback(true); // ERROR
        }
        else {
            console.log(selfname + 'ALIVE_NODE created SUCCESS: %s', alive_ephemeral_node_path);
            callback(null, true); //SUCCESS
        }
    });
}

function delete_alive_node(callback) {
    const selfname = '[' + MODULE_NAME + '.delete_alive_node] ';

    app_zkClient.remove(alive_ephemeral_node_path, (error) => {
        if (error) {
            console.log(selfname + 'Failed to remove ALIVE_NODE: %s due to: %s.', alive_ephemeral_node_path, error);
            callback(true); // ERROR
        }
        else {
            console.log(selfname + 'ALIVE_NODE removed SUCCESS: %s', alive_ephemeral_node_path);
            callback(null, true); //SUCCESS
        }
    });
}

/** 
 * Not use
 * App now read config from ZK
 *---------------------------------------------------------
function load_config(filename) {
    let config = null;
    
    if (filename) {
        config = YAML.load(filename);
        return config;
    }
    
    config = config_utils.get_config_from_environment();
    return config;
}
 *---------------------------------------------------------
 */
 
function do_config(callback) {
    common_utils.logging_config(config.log_file);
    common_utils.write_log('info', 'load_config', 'SUCCESS', 'Main config loaded!');
    callback(null, true); //Always SUCCESS
}


/**
 * Get SERVER_INFO from a SERVER_LIST (from INFO_NODE)
 * @host {string} IP of the server where the app is running on
 * @serverListYml {string} YAML string that was got from INFO_NODE
 */
function get_server_info_from_server_list(host, serverListYml){
    const selfname = MODULE_NAME + '.get_server_info_from_server_list';
    //const selfname_forConsole = '[' + module_name + '.get_server_info_from_server_list] ';
    const debug_logger = require('debug')(selfname);

    let svrInfo = null;
    
    // serverList is info about ALL app and SERVER (as a List).
    // So we need to loop through the list and get correct APP_INFO
    let serverList = YAML.parse(serverListYml);
    for (let i in serverList) {
        let serverInfo = serverList[i];
        
        // On SERVER_LIST, get the right SERVER
        if (serverInfo.host === host) {
            debug_logger('DEBUG', 'server_info:', serverInfo.host, '---> Selected');
            svrInfo = serverInfo;
            break;
        }
        else {
            debug_logger('DEBUG', 'server_info:', serverInfo.host, '---> Ignored');
        }
    }
    
    debug_logger('DEBUG', '[Result]', 'server_info:', svrInfo);
    return svrInfo;
}


/**
 * Check if can get SERVER_INFO at now.
 * If not get SERVER_INFO before or data expiried ---> Get SERVER_INFO
 */
function can_get_server_info() {
    if (!runtime_config.server_app_info) {
        return true;
    }
    
    if (!runtime_config.server_app_info.epoch) {
        return true;
    }
    
    if (common_utils.is_epoch_expired(
            runtime_config.server_app_info.epoch, 
            config.info_expried_seconds)) {
        return true;
    }
    
    return false;
}


/**
 * Get SERVER_INFO (name, apps) from ZK.
 * This function will get SERVER_INFO from ZK 
 *     and save it to @runtime_config.server_app_info
 */
function get_server_info(callback) {
    
    const debug_logger = require('debug')('controller.get_server_info');
    const debug_logger_x = require('debug')('controller.get_server_info_x');

    if (!can_get_server_info()) {
        debug_logger('Cannot get server info');
        callback(null, 'Info is updated.');
    }
    else {
        debug_logger('Run');
        
        // APP_INFO is stored in @info_node on the ZK server
        zk_helper.zk_get_node_data(config.zk_server.host, config.zk_server.port, 
            config.zk_server.info_node, (error, data) => {
                if (error) {
                    debug_logger('FAIL');
                    debug_logger_x('error =', error);
                    callback(error);
                }
                else {
                    let svrInfo = {};
                    svrInfo.data = get_server_info_from_server_list(config.host_ip, data);
                    svrInfo.epoch = common_utils.get_current_time_as_epoch();

                    runtime_config.server_app_info = svrInfo;
                    
                    debug_logger('SUCCESS');
                    debug_logger_x('server_info =', JSON.stringify(runtime_config.server_app_info));
                    
                    callback(null, svrInfo);
                }
            });
    }
}





/*
 ____                              
|  _ \ _ __ ___   ___ ___  ___ ___ 
| |_) | '__/ _ \ / __/ _ \/ __/ __|
|  __/| | | (_) | (_|  __/\__ \__ \
|_|   |_|  \___/ \___\___||___/___/                             
===========================================
*/

function get_one_job(callback) {
    /* 
    Get Jobs from ZK and get the Job that have smallest time but in job_expried_seconds
    */
    const selfname = MODULE_NAME + '.get_one_job';
    const debug_logger = require('debug')(selfname);

    let currentdate_epoch = common_utils.get_current_time_as_epoch();
    debug_logger('Current time EPoch =', currentdate_epoch);

    zk_helper.zk_get_children(config.zk_server.host, config.zk_server.port, job_queue_path,
        (err, jobs) => {
            if (err) {
                callback(err);
            }
            else {
                debug_logger('All Jobs = ', JSON.stringify(jobs));

                let minTime = -1;
                let selectedJob = null;

                for (let i in jobs) {
                    let job_name = jobs[i];
                    debug_logger('Processing Job:', job_name);

                    let job_name_parts = job_name.split(job_name_seperator);

                    // Bo qua nhung Job khong bat dau bang epoch
                    //   VD: DOING__xxxx, DONE__xxxx
                    let time_part = job_name_parts[0];
                    debug_logger('Time part:', time_part);

                    if (time_part && !Number.isNaN(time_part)) {
                        if (!common_utils.is_epoch_expired(time_part, config.job_expried_seconds)) {
                            if (minTime == -1 || time_part < minTime) {
                                minTime = time_part;
                                selectedJob = job_name;
                                debug_logger('temp Job: ',
                                    selectedJob, ', epoch = ', minTime);
                                break;
                            }
                        }
                        else {
                            debug_logger('Job is expired');
                        }
                    }
                    else {
                        debug_logger('Job name not begin with EPOCH ---> Ignored');
                    }
                }

                if (minTime != -1) {
                    glob_vars.job_to_run = parse_job_info(selectedJob);
                    debug_logger('Selected Job: ', selectedJob, ', epoch = ', minTime);
                    console.log(selfname, ' Selected Job: ', selectedJob, ', epoch = ', minTime);
                }
                else {
                    debug_logger('No selected Job.');
                    console.log(selfname, ' No selected Job.');
                }

                callback(null, selectedJob);
            }
        });
}


/**
 * Get APP_INFO from a SERVER_LIST (from INFO_NODE).
 *   This function will asign @runtime_config.job_to_run.app as APP_INFO will
 * @host {string} IP of the server where the app is running on
 * @appname {string} Name of the app (defined in INFO_NODE)
 * @serverListYml {string} YAML string that was got from INFO_NODE
 */
function get_app_info_from_server_info(appname, callback){
    const selfname = MODULE_NAME + '.get_app_info_from_server_info';
    const debug_logger = require('debug')(selfname);
    
    let appInfo = null;
    let appList = runtime_config.server_app_info.data.apps;
    
    for (let i in appList) {
        if (appList[i].name === appname) {
            appInfo = appList[i];
            break;
        }
        
    }
        
    debug_logger('DEBUG', 'app_info:', appInfo);

    if (!appInfo) {
        callback('Cannot get APP_INFO: ' + appname);
        return;
    }
    
    runtime_config.job_to_run.app = appInfo;
    
    console.log(selfname, 'INFO', 'App_info got');
    
    callback(null, appInfo);
    return appInfo;
}


/**
 * Get APP_INFO from INFO_NODE
 *   NOTE: When finised, @runtime_config.job_to_run.app = APP_INFO
 * @host {string} IP of the server where the app is running on
 * @appname {string} Name of the app (defined in INFO_NODE)
 * @callbakc {function} The callback function.
 */
function get_app_info(appname, callback) {
    const selfname = '[' + MODULE_NAME + '.get_app_info]';

    async.series(
        [
            get_server_info,
            async.apply(get_app_info_from_server_info, appname)
        ],
        (err, data) => {
            if (err) {
                console.log(selfname, '[ERROR]', err);
            }
            else {
                callback(null, data[1]);
            }
        }
    );
}


function get_commander_location_str(appType) {
    let ctlerLocation = MODNAME_CONTROLER_PATH 
        + appType.toLowerCase() + '_controller.js';
    if(fs.existsSync(ctlerLocation)) {
        return ctlerLocation;
    }
    return MODNAME_CONTROLER_PATH + 'common_controller.js';
}


/**
 * Do JOB in @runtime_config.job_to_run
 */
function do_one_job(jobObj, callback) {
    const selfname = MODULE_NAME + '.do_one_job';
    const debug_logger = require('debug')(selfname);

    if(!jobObj) {
        console.log(selfname, "[WARN]", "No job to run.");
        return;
    }
    
    debug_logger('[DEBUG]', 'params @job_object: ', jobObj);
    
    let controllerPath = get_commander_location_str(jobObj.app.type);
    const cmder = require(controllerPath);

    cmder.run(jobObj, callback);
}


/**
 * Do JOB
 * Job is stored in {runtime_config.job_to_run}
 * @callback {function} function to callback
 */
function do_job(node_name, callback) {
    const selfname = MODULE_NAME + '.do_job';
    const debug_logger = require('debug')(selfname);

    // CHECK BEFORE RUN
    if (!glob_vars.job_to_run) {
        console.log(selfname, 'NO RUN');
        callback('No selected job!');
        return;
    }
    console.log(selfname, 'Job to run: ', glob_vars.job_to_run);
    
    // PROCESS FOR ALL__epoch__UPDATE_SERVER_INFO
    
    if (glob_vars.job_to_run.command === STR_UPDATE_SERVER_INFO) {
        get_server_info((err, data) => {
            if (err) {
                console.log(selfname, 'Update server info get ERROR:', err);
                callback(err);
            }
            else {
                console.log(selfname, 'Update server info get success');
                callback(null, data);
            }
        });
        return;
    }
    
    async.series(
        [
            async.apply(get_app_info, glob_vars.job_to_run.app_name),
            async.apply(do_one_job, glob_vars.job_to_run)
        ],
        (err, data) => {
            if (err) {
                console.log(selfname, 'call "get_app_info" get Error');
                debug_logger('DEBUG', 'get_app_info Error msg', '--->', data);
                callback(true); // ERROR
            }
            else {
                debug_logger('DEBUG', 'DO_JOB DATA: ', '--->', data);
                callback(null, null); //SUCCESS
            }
        }
    );
}


/*
 ____              
|  _ \ _   _ _ __  
| |_) | | | | '_ \ 
|  _ <| |_| | | | |
|_| \_\\__,_|_| |_|
===========================================
*/
function show_result(callback) {
    console.log('\n\n\n\n----------------------------------------');
    console.log('***** RESULT');
    console.log('----------------------------------------');
    console.log(YAML.stringify(run_result));
    console.log('----------------------------------------');

    console.log('\n\n\n\n----------------------------------------');
    console.log('***** DEPEND');
    console.log('----------------------------------------');
    console.log(YAML.stringify(depended_app_status));
    console.log('----------------------------------------');

    callback(null, true);
}

function run(callback) {
    const selfname = MODULE_NAME + '.run';
    const debug_logger = require('debug')(selfname);

    function move_node_show_err(err) {
        if (err) {
            debug_logger('Move node fail');
        }
        else {
            debug_logger('Move node success');
        }
    }
    
    function run_async_final(err, result) {
        function process_running_result(err, result) {
            const debug_logger = require('debug')('Controller.run.run_async_final.process_running_result');
            const debug_logger_x = require('debug')('Controller.run.run_async_final.process_running_result_x');
            
            debug_logger('Checking and set next loop');

            if (err) {
                console.log('Controller.Run --> Error: %s', err);
                debug_logger('FAIL');
                debug_logger_x('ERROR: ', err);
                
                // Move JOB_NODE to the FAIL_QUEUE
                if (glob_vars.is_job_running) {
                    sub_run_move_node_after_run_fail(
                        glob_vars.job_to_run.job_full_name, 
                        (err, result) => {
                            move_node_show_err(err);
                        }
                    );
                    console.log('JOB_NODE is moved to FAIL_QUEUE');
                }
            }
            else {
                console.log('Controller.Run --> Success');
                
                // Move JOB_NODE to the SUCCESS_QUEUE
                sub_run_move_node_after_run_success(
                    glob_vars.job_to_run.job_full_name, 
                    (err, result) => {
                        move_node_show_err(err);
                    }
                );
                console.log('JOB_NODE is moved to SUCCESS_QUEUE');
            }
        }
        
        /*
        function set_next_loop() {
            const debug_logger = require('debug')('Controller.run.run_async_final.set_next_loop');
            
            debug_logger('Checking and set next loop');
            
            // Kiem tra + dat loop time
            debug_logger('@runtime_config: ' + JSON.stringify(runtime_config));
            let sleepSec = parseInt(common_utils.if_null_then_default(runtime_config.sleep_seconds, 0), 10);
            debug_logger('SLEEP SECONDS: ' + sleepSec);
            
            // sleepSec never be null, read above
            if (sleepSec > 0) {
                setTimeout(run, sleepSec * 1000);
                console.log('Next loop will be run at next %s second(s)', sleepSec);
                console.log("\n\n\n\n\n");
            }
            else {
                console.log('No loop will be run. Because, "sleep_seconds = 0"');
                
                debug_logger('Remove EPHEMERAL NODE');
                
                delete_alive_node((err, result) => {
                    if(err) {
                        debug_logger('Remove EPHEMERAL NODE get error: ' + err);
                    }
                    else {
                        debug_logger('Remove EPHEMERAL NODE SUCCESS');
                    }
                    
                    app_zkClient.close();
                });
                /**
                 * NEVER LOOP IMMEDIATELY!!
                 * So I comment this
                 * ----------------------------------------
                setTimeout(run, 0);
                console.log('Next loop will be run NOW!',
                    parseInt(sleepSec));
                 * ----------------------------------------
                 * *
            }

            //callback(null, true); // Always success
        }
        */
        
        process_running_result(err, result);
        
        if(err) {
            //callback(err);
            callback(null, true);
        }
        else {
            callback(null, result);
        }
    }
    
    // using in async.waterfall
    function sub_run_move_node(node_name, src_path, des_path, callback) {
        if(!node_name) {
            debug_logger('No node name to move');
            // Return received values
            callback(null, node_name);
            return;
        }
        
        // Move node
        zk_helper.zk_move_node(
            config.zk_server.host, 
            config.zk_server.port,
            src_path,
            des_path,
            (err, data) => {
                if (err) {
                    callback(err); //ERROR
                }
                else {
                    callback(null, node_name);
                }
            }
        );
    }
    
    
    // using in async.waterfall
    function sub_run_move_node_before_run(node_name, callback) {
        if (node_name) {
            // Move node
            let src_path = job_queue_path + '/' + node_name;
            let des_path = running_job_path + '/' + runtime_config.host_ip + '__' + node_name;
            sub_run_move_node(node_name, src_path, des_path, callback);
        }
        else {
            callback(null, node_name); //For next step (waterfall)
        }
    }
    
    // using in async.waterfall
    function sub_run_move_node_after_run_fail(node_name, callback) {
        // Move node
        let src_path = running_job_path + '/' + runtime_config.host_ip + '__' + node_name;
        let des_path = fail_job_path + '/' + runtime_config.host_ip + '__' + node_name;
        sub_run_move_node(node_name, src_path, des_path, callback);
    }
    
    // using in async.waterfall
    function sub_run_move_node_after_run_success(node_name, callback) {
        // Move node
        let src_path = running_job_path + '/' + runtime_config.host_ip + '__' + node_name;
        let des_path = success_job_path + '/' + runtime_config.host_ip + '__' + node_name;
        sub_run_move_node(node_name, src_path, des_path, callback);
    }
    
    function update_job_status_to_running(node_name, callback) {
        if (node_name) {
            glob_vars.is_job_running = true;
        }
        callback(null, node_name);
    }
    
    debug_logger('Init @runtime_config');
    glob_vars = {}; //Reset runtime config

    debug_logger('Run main process (waterfall)');
    async.waterfall(
        [
            //async.apply(load_runtime_config_from_zk, config.zk_server.host, config.zk_server.port, conf_path),
            //process_for_is_alive,
            //process_for_is_alive_list,
            //get_depend_on_app_status,
            //process_for_dependencies,
            //async.apply(write_result_data_to_zk, config.zk_server.host, config.zk_server.port, result_path),
            //async.apply(manage_alive_node, config.zk_server.host, config.zk_server.port, alive_path),
            //async.apply(manage_alive_list, config.zk_server.host, config.zk_server.port)

            //1. Lay 1 JOBS
            get_one_job,
            //2. Move node to RUNNING_QUEUE
            sub_run_move_node_before_run,
            update_job_status_to_running,
            //3. Thuc hien JOB o buoc 1 ---> job_result
            do_job
            //4. Move JOB vao DONE_QUEUE

            ////show_result, // TAM MO TRONG QUA TRINH TEST
        ],
        run_async_final
    );
}






/*---------------------------------------------------------------------
 ______                       _       
|  ____|                     | |      
| |__  __  ___ __   ___  _ __| |_ ___ 
|  __| \ \/ / '_ \ / _ \| '__| __/ __|
| |____ >  <| |_) | (_) | |  | |_\__ \
|______/_/\_\ .__/ \___/|_|   \__|___/
            | |                       
            |_|                       
---------------------------------------------------------------------*/
exports.run = run;
//exports.set_logger = set_logger;
exports.set_config = set_config;
exports.do_config = do_config;
exports.init_by_conf = init_by_conf;