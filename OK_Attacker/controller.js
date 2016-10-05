"use strict";

const async = require("async");
const YAML = require('yamljs');
const zookeeper = require('node-zookeeper-client');
const fs = require('fs');

//OK_Project utils
const this_attacker_name = process.env.NODE_HOST_IP;

const common_utils = require('./utils/common_utils');
const zk_helper = require('./utils/zk_helper');

const module_name = 'controller';

const DONE_JOB_PREFIX = 'DONE';
const DOING_JOB_PREFIX = 'DOING';
const JOB_NAME_SEPARATOR = '__';
const STR_UPDATE_SERVER_INFO = 'UPDATE_SERVER_INFO';
const JOB_QUEUE_PATH = '/danko/attacker/' + this_attacker_name;
const RUNNING_JOB_PATH = '/danko/attacker/running_jobs';
const FAIL_JOB_PATH = '/danko/attacker/fail_jobs';
const SUCCESS_JOB_PATH = '/danko/attacker/success_jobs';
const const_alive_path = '/danko/monitor/attacker_' + this_attacker_name;
const mod_controller_path = './ok_modules/';

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
    
var runtime_config = null;


var run_result = null;
var depended_app_status = null;

var zk_client = null;

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
function init_by_conf(p_config, callback) {
    const mkdirp = require('mkdirp');
    const path = require('path');

    const selfname = '[' + module_name + '.init_by_conf] ';
    
    //Set local config
    config = p_config;

    async.series(
        [
            // Create log directory if not exists
            (callback) => {
                let log_path = path.dirname(p_config.log_file);
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
                p_config.zk_server.host,
                p_config.zk_server.port,
                JOB_QUEUE_PATH
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
    
    let jobParts = job_str.split(JOB_NAME_SEPARATOR);
    
    jobInfo.job_full_name = job_str;
    jobInfo.created_epoch = jobParts[0];
    jobInfo.app_name = jobParts[1];
    jobInfo.command = jobParts[2];
    return jobInfo;
}


function zk_create_client(callback) {
    const timeout_second = 5;
    const selfname = '[' + module_name + '.zk_create_client] '

    zk_client = zookeeper.createClient(config.zk_server.host + ':' + config.zk_server.port);

    let timer = null;

    zk_client.once('connected', function() {
        // Xoa time-out check
        if (timer) {
            clearTimeout(timer);
        }
        callback(null, zk_client);
        // Log when connect SUCCESS
        console.log(selfname, 'Create ZK-Client Connected to Server.');
    });

    timer = setTimeout(() => {
        console.log(selfname + 'TimeOut - Current state is: %s', zk_client.getState());
        zk_client.close();
        callback('Timeout when calling to ZK-Server.'); //ERR
    }, timeout_second * 1000);

    zk_client.connect();
}


/**
 * Create a Node to let other know that this process is alive.
 */
function create_alive_node(callback) {
    const selfname = '[' + module_name + '.create_alive_node] '

    zk_client.create(const_alive_path, zookeeper.CreateMode.EPHEMERAL, (error) => {
        if (error) {
            console.log(selfname + 'Failed to create ALIVE_NODE: %s due to: %s.', const_alive_path, error);
            callback(true); // ERROR
        }
        else {
            console.log(selfname + 'ALIVE_NODE created SUCCESS: %s', const_alive_path);
            callback(null, true); //SUCCESS
        }
    });
}

function load_config_from_file(filename) {
    let config = YAML.load(filename);
    return config;
}

function do_config(config, callback) {
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
    const selfname = module_name + '.get_server_info_from_server_list';
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


function write_result_data_to_zk(host, port, path, callback) {
    // @ Async Compatible
    var result_data = YAML.stringify(run_result);
    async.series([
            async.apply(zk_helper.zk_set_node_data, host, port, path, result_data)
        ],
        function(err, data) {
            if (err) {
                console.log('Cannot write RUNNING RESULT because of error: %s', err);
                common_utils.write_log('info', 'controller.write_result_data_to_zk', 'FAILED', {
                    host: host,
                    port: port,
                    path: path,
                    msg: 'Get Error when writting RUNNING RESULT'
                });
                callback(err);
            }
            else {
                console.log('RUNNING RESULT wrote:\n%s', result_data);
                common_utils.write_log('info', 'controller.write_result_data_to_zk', 'FAILED', {
                    host: host,
                    port: port,
                    path: path,
                    msg: 'Success writting RUNNING RESULT'
                });
                callback(null, run_result);
            }
        }
    );
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
    const selfname = module_name + '.get_one_job';
    const debug_logger = require('debug')(selfname);

    let currentdate_epoch = common_utils.get_current_time_as_epoch();
    debug_logger('Current time EPoch =', currentdate_epoch);

    zk_helper.zk_get_children(config.zk_server.host, config.zk_server.port, JOB_QUEUE_PATH,
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

                    let job_name_parts = job_name.split(JOB_NAME_SEPARATOR);
                    /* Khong con su dung - Cap nhat bang doan ben duoi
                    ////------------------------------------------
                    // Bo qua nhung Jon da thuc hien xong (DONE__xxxxx)
                    if (job_name_parts[0] != done_job_prefix) {
                        let time_part = job_name_parts[1];
                        console.log(selfname, selfname, 'Time part:', time_part);

                        if (time_part && !Number.isNaN(time_part) 
                                && !common_utils.is_epoch_expired(time_part, config.job_expried_seconds)) {
                            if (minTime == -1 || time_part < minTime) {
                                minTime = time_part;
                                selectedJob = job_name;
                                console.log(selfname, 'temp Job: ',
                                    selectedJob, ', epoch = ', minTime);
                                break;
                            }
                        }
                    }
                    ////------------------------------------------
                    */
                    // Bo qua nhung Job khong bat dau bang epoch
                    //  VD: DOING__xxxx, DONE__xxxx
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
                    runtime_config.job_to_run = parse_job_info(selectedJob);
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
    const selfname = module_name + '.get_app_info_from_server_info';
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
    const selfname = '[' + module_name + '.get_app_info]';

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
    let ctlerLocation = mod_controller_path 
        + appType.toLowerCase() + '_controller.js';
    if(fs.existsSync(ctlerLocation)) {
        return ctlerLocation;
    }
    return mod_controller_path + 'common_controller.js';
}


/**
 * Do JOB in @runtime_config.job_to_run
 */
function do_one_job(jobObj, callback) {
    const selfname = module_name + '.do_one_job';
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
    const selfname = module_name + '.do_job';
    const debug_logger = require('debug')(selfname);

    // CHECK BEFORE RUN
    if (!runtime_config.job_to_run) {
        console.log(selfname, 'NO RUN');
        callback('No selected job!');
        return;
    }
    console.log(selfname, 'Job to run: ', runtime_config.job_to_run);
    
    // PROCESS FOR ALL__epoch__UPDATE_SERVER_INFO
    
    if (runtime_config.job_to_run.command === STR_UPDATE_SERVER_INFO) {
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
            async.apply(get_app_info, runtime_config.job_to_run.app_name),
            async.apply(do_one_job, runtime_config.job_to_run)
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

function run() {
    const selfname = module_name + '.run';
    const debug_logger = require('debug')(selfname);
    const debug_logger_x = require('debug')(selfname+'_x');
    //var alive_path = const_danko_alive_path + config.zk_server.conf_name;

    function move_node_show_err(err) {
        if (err) {
            debug_logger('Move node fail');
        }
        else {
            debug_logger('Move node success');
        }
    }
    
    function run_async_final(err, result) {
        function process_running_result(err, result, callback) {
            const debug_logger = require('debug')('Controller.run.run_async_final.process_running_result');
            const debug_logger_x = require('debug')('Controller.run.run_async_final.process_running_result_x');
            
            debug_logger('Checking and set next loop');

            if (err) {
                console.log('Controller.Run --> Error: %s', err);
                debug_logger('FAIL');
                debug_logger_x('ERROR: ', err);
                
                // Move JOB_NODE to the FAIL_QUEUE
                if (runtime_config.is_job_running) {
                    sub_run_move_node_after_run_fail(
                        runtime_config.job_to_run.job_full_name, 
                        (err, result) => {
                            move_node_show_err(err);
                            callback(null, true); //for do next step
                        }
                    );
                    console.log('JOB_NODE is moved to FAIL_QUEUE');
                }
                else {
                    callback(null, true); //for do next step
                }
            }
            else {
                console.log('Controller.Run --> Success');
                
                // Move JOB_NODE to the SUCCESS_QUEUE
                sub_run_move_node_after_run_success(
                    runtime_config.job_to_run.job_full_name, 
                    (err, result) => {
                        move_node_show_err(err);
                        callback(null, true); //for do next step
                    }
                );
                console.log('JOB_NODE is moved to SUCCESS_QUEUE');
            }
        }
        
        function set_next_loop(arg, callback) {
            const debug_logger = require('debug')('Controller.run.run_async_final.set_next_loop');
            
            debug_logger('Checking and set next loop');
            
            // Kiem tra + dat loop time
            if (config.sleep_seconds) {
                if (config.sleep_seconds > 0) {
                    setTimeout(run, parseInt(config.sleep_seconds) * 1000);
                    console.log('Next loop will be run at next %s second(s)',
                        parseInt(config.sleep_seconds));
                    console.log("\n\n\n\n\n");
                }
                else {
                    setTimeout(run, 0);
                    console.log('Next loop will be run NOW!',
                        parseInt(config.sleep_seconds));
                }
            }
            else {
                console.log('No loop will be run. Because, ENV_VAR: "NODE_OKATK_SLEEP_SEC" not set yet!');
            }
            
            callback(null, true); // Always success
        }
        
        async.waterfall(
            [
                async.apply(process_running_result, err, result),
                set_next_loop
            ]
        );
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
            let src_path = JOB_QUEUE_PATH + '/' + node_name;
            let des_path = RUNNING_JOB_PATH + '/' + this_attacker_name + '__' + node_name;
            sub_run_move_node(node_name, src_path, des_path, callback);
        }
        else {
            callback(null, node_name); //For next step (waterfall)
        }
    }
    
    // using in async.waterfall
    function sub_run_move_node_after_run_fail(node_name, callback) {
        // Move node
        let src_path = RUNNING_JOB_PATH + '/' + this_attacker_name + '__' + node_name;
        let des_path = FAIL_JOB_PATH + '/' + this_attacker_name + '__' + node_name;
        sub_run_move_node(node_name, src_path, des_path, callback);
    }
    
    // using in async.waterfall
    function sub_run_move_node_after_run_success(node_name, callback) {
        // Move node
        let src_path = RUNNING_JOB_PATH + '/' + this_attacker_name + '__' + node_name;
        let des_path = SUCCESS_JOB_PATH + '/' + this_attacker_name + '__' + node_name;
        sub_run_move_node(node_name, src_path, des_path, callback);
    }
    
    function update_job_status_to_running(node_name, callback) {
        if (node_name) {
            runtime_config.is_job_running = true;
        }
        callback(null, node_name);
    }
    
    debug_logger('Init @runtime_config');
    runtime_config = {};

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
exports.load_config_from_file = load_config_from_file;
exports.do_config = do_config;
exports.init_by_conf = init_by_conf;