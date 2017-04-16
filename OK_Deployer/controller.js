"use strict";

// Node Module
const async = require("async");
const YAML = require('yamljs');
const fs = require('fs');

// OK_Project Module
const common_utils = require('./utils/common_utils');
const zk_helper = require('./utils/zk_helper');

const MODULE_NAME = 'controller';

// Command to update server info
// Use in case of dont have app-type when sent command to attacker
const STR_NO_APP_TYPE = 'NO_APP_TYPE';

const MODNAME_CONTROLER_PATH = './ok_modules/';

const MAPNAME_JOB_NAME_SEPERATOR = 'deployer_job_name_seperator';
const MAPNAME_JOB_PATH = 'deployer_job_path';
const MAPNAME_MONITOR_PATH = 'monitor';
////const MAPNAME_HOST_IP = 'host_ip'; khong con su dung - PhongNTT - 2017-04-02
const MAPNAME_RUNNING_JOB_PATH = 'deployer_running_job_path';
const MAPNAME_FAIL_JOB_PATH = 'deployer_fail_job_path';
const MAPNAME_SUCSESS_JOB_PATH = 'deployer_succes_job_path';

/*---------------------------------------------------------------------
##     ##    ###    ########  
##     ##   ## ##   ##     ## 
##     ##  ##   ##  ##     ## 
##     ## ##     ## ########  
 ##   ##  ######### ##   ##   
  ## ##   ##     ## ##    ##  
   ###    ##     ## ##     ##  
---------------------------------------------------------------------*/

var config = {};
    
var runtime_config = {};

var glob_vars = null;

// ZK_Path using to receive JOB of this Deployer
var job_queue_path = '/danko/deployer_jobs/jobs'; //default value

var job_name_seperator = '__'; //default value

var running_job_path = '/danko/deployer_jobs/running_jobs'; //default value
var fail_job_path = '/danko/deployer_jobs/fail_jobs'; //default value
var success_job_path = '/danko/deployer_jobs/success_jobs'; //default value

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
    //const debug_logger = require('debug')(MODULE_NAME + '.set_config');
    
    config = p_config;
    runtime_config = p_runtime_config;
    
    init_global_vars();
}


// Init global variable for this app
function init_global_vars() {
    job_name_seperator = config.zk_server.main_conf_data[MAPNAME_JOB_NAME_SEPERATOR];

    // Job Paths
    job_queue_path = config.zk_server.main_conf_data[MAPNAME_JOB_PATH]; //job_path
    running_job_path = config.zk_server.main_conf_data[MAPNAME_RUNNING_JOB_PATH];
    fail_job_path = config.zk_server.main_conf_data[MAPNAME_FAIL_JOB_PATH];
    success_job_path = config.zk_server.main_conf_data[MAPNAME_SUCSESS_JOB_PATH];
}


/**
 * Parse @jobName into an object @jobInfo
 * Deployer Job name template: <epoch>__<time_to_run>
 * Params:
 *   @jobName {string} Job name
 * Ouput: @jobObj
 *   @jobObj.job_full_name {string} Full name of the job
 *   @jobObj.created_epoch {string} Created time of job as Epoch number
 *   @jobObj.time_to_run {string} Time for the job is run as Epoch number
 *   @jobObj.content {object} An object that convert from YAML got from JOB_NODE content
 */
function create_job_object(jobName, callback) {
// Async compatible
    const debug_logger = require('debug')('create_job_object');

    let job_node_path = job_queue_path + '/' + jobName;
    let jobInfo = {};
    
    let jobParts = jobName.split(job_name_seperator);
    
    jobInfo.job_full_name = jobName;
    jobInfo.created_epoch = jobParts[0];
    jobInfo.time_to_run = jobParts[1];

    zk_helper.zk_get_node_data(config.zk_server.host, config.zk_server.port, 
        job_node_path, (error, data) => {
            if (error) {
                debug_logger('FAIL');
                debug_logger('error =', error);
                callback(common_utils.create_error__ZK_read_node_data('Cannot read Serrver-App info'));
            }
            else {
                let contentObj = YAML.parse(data);
                
                jobInfo.content = contentObj;
                
                debug_logger('SUCCESS');
                debug_logger('@jobInfo =', JSON.stringify(jobInfo));
                
                callback(null, jobInfo);
            }
        }
    );
}


/**
 * Get SERVER_INFO from a SERVER_LIST (from INFO_NODE)
 * Params:
 *   @host {string} IP of the server where the app is running on
 *   @serverListYml {string} YAML string that was got from INFO_NODE
 */

/*--------------------------------------
2017-04-02
CO THE KHONG DUNG CHO DEPLYER
SAU KHI XONG DEPLOYER THI KIEM TRA LAI HAM NAY
NEU KHONG CON SU DUNG THI XOA
-----------------------------------------
function get_server_info_from_server_list(host, serverListYml){
    const selfname = MODULE_NAME + '.get_server_info_from_server_list';
    //const selfname_forConsole = '[' + module_name + '.get_server_info_from_server_list] ';
    const debug_logger = require('debug')(selfname);

    debug_logger('DEBUG', 'host:', host);
    
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
---------------------------------------*/


/**
 * Check if can get SERVER_INFO at now.
 * If not get SERVER_INFO before or data expiried ---> Get SERVER_INFO
 */
/*--------------------------------------
2017-04-02
CO THE KHONG DUNG CHO DEPLYER
SAU KHI XONG DEPLOYER THI KIEM TRA LAI HAM NAY
NEU KHONG CON SU DUNG THI XOA
-----------------------------------------
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
-----------------------------------------*/


/**
 * Get SERVER_INFO (name, apps) from ZK.
 * This function will get SERVER_INFO from ZK 
 *     and save it to @runtime_config.server_app_info
 */
/*--------------------------------------
2017-04-02
CO THE KHONG DUNG CHO DEPLYER
SAU KHI XONG DEPLOYER THI KIEM TRA LAI HAM NAY
NEU KHONG CON SU DUNG THI XOA
-----------------------------------------
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
            config.zk_server.main_conf_data.app_info_path, (error, data) => {
                if (error) {
                    debug_logger('FAIL');
                    debug_logger_x('error =', error);
                    callback(common_utils.create_error__ZK_read_node_data('Cannot read Serrver-App info'));
                }
                else {
                    let svrInfo = {};
                    svrInfo.data = get_server_info_from_server_list(runtime_config.host_ip, data);
                    svrInfo.epoch = common_utils.get_current_time_as_epoch();

                    runtime_config.server_app_info = svrInfo;
                    
                    debug_logger('SUCCESS');
                    debug_logger_x('server_info =', JSON.stringify(runtime_config.server_app_info));
                    
                    callback(null, svrInfo);
                }
            });
    }
}
-----------------------------------------*/





/*
 ____                              
|  _ \ _ __ ___   ___ ___  ___ ___ 
| |_) | '__/ _ \ / __/ _ \/ __/ __|
|  __/| | | (_) | (_|  __/\__ \__ \
|_|   |_|  \___/ \___\___||___/___/                             
===========================================
*/

/**
 * Check is @strDeployCmdName a valid deploy command name
 * Params:
 *   @strDeployCmdName {string} name to check
 *   @job_name_seperator {string} seperator used in job name to seperate parts of name
 */
function isValidDeployJobName(strDeployCmdName, job_name_seperator) {
// valid name: <createdTime-UnixEpoch__timeToRun-UnixEpoch>
    let job_name_parts = strDeployCmdName.split(job_name_seperator);
    
    // Check number of parts
    if(job_name_parts.length != 2) {
        return false;
    }
    
    // Check all parts is number (UnixEpoch)
    for(let i in job_name_parts) {
        let namePart = job_name_parts[i];
        if (Number.isNaN(namePart)) {
            return false;
        }
    }
    
    return true;
}


/**
 * Check is @strDeployCmdName a active deploy job
 *   Active deploy job is the job that not expired.
 * Params:
 *   @strDeployCmdName {string} name to check
 *   @job_name_seperator {string} seperator used in job name to seperate parts of name
 */
function isActiveDeployJobName(strDeployCmdName, job_name_seperator) {
    // Check valid name
    if (!isValidDeployJobName(strDeployCmdName, job_name_seperator)) {
        return false; //not a valid job
    }
    
    let currentdate_epoch = common_utils.get_current_time_as_epoch();
    let job_name_parts = strDeployCmdName.split(job_name_seperator);
    let createdTime = Number(job_name_parts[0]);
    let timeToRun = Number(job_name_parts[1]);
    // timeToRun = 1 --> run as soon as posible
    
    // Check not expired
    if(common_utils.is_epoch_expired(createdTime, config.job_expried_seconds)) {
        return false; //Expired
    }
    
    // Check timeToRun with present time
    if(timeToRun < currentdate_epoch && timeToRun != 1) {
        return false;
    }
    
    return true;
}


/** 
* Get Job that have smallest time but in job_expried_seconds
**/
function get_one_job(callback) {
    const selfname = MODULE_NAME + '.get_one_job';
    const debug_logger = require('debug')(selfname);

    let currentdate_epoch = common_utils.get_current_time_as_epoch();
    debug_logger('Current time EPoch =', currentdate_epoch);

    // get job list
    zk_helper.zk_get_children(config.zk_server.host, config.zk_server.port, job_queue_path,
        (err, jobs) => {
            if (err) {
                callback(common_utils.create_error__ZK_get_child('Cannot get Jobs-list from ZK'));
            }
            else {
                debug_logger('All Jobs = ', JSON.stringify(jobs));

                let minTimeToRun = -1;
                let minCreatedTime = -1;
                let selectedJob = null;

                for (let i in jobs) {
                    let job_name = jobs[i];
                    debug_logger('Processing Job:', job_name);

                    if (isActiveDeployJobName(job_name, job_name_seperator)) {
                        let createdTime = Number(job_name.split(job_name_seperator)[0]);
                        let timeToRunJob = Number(job_name.split(job_name_seperator)[1]);
                        if (minTimeToRun == -1 || timeToRunJob < minTimeToRun || 
                                (timeToRunJob == minTimeToRun && createdTime < minCreatedTime)) {
                            minTimeToRun = timeToRunJob;
                            minCreatedTime = createdTime;
                            selectedJob = job_name;
                            debug_logger('temp Job: ',
                                selectedJob, ', timeToRun = ', minTimeToRun);
                            break;
                        }
                    }
                    else {
                        debug_logger('Job name not begin with EPOCH ---> Ignored');
                    }
                }

                if (minTimeToRun != -1) {
                    async.waterfall(
                        [
                            async.apply(create_job_object, selectedJob)
                        ],
                        (err, data) => {
                            if(err) {
                                debug_logger('Cannot create JobObject.');
                                console.log(selfname, ' Cannot create JobObject.');
                                callback(create_error__CannotCreateJobObject('Cannot create JobObject.')); //ERROR
                            }
                            else {
                                glob_vars.job_to_run = data;
                                debug_logger('Selected Job: ', selectedJob, ', epoch = ', minTimeToRun);
                                console.log(selfname, ' Selected Job: ', selectedJob, ', epoch = ', minTimeToRun);
                                callback(null, selectedJob);
                            }
                        }
                    );
                }
                else {
                    debug_logger('No selected Job.');
                    console.log(selfname, ' No selected Job.');
                    callback(create_error__NoSelectedJob('No selected Job.')); //ERROR
                }
            }
        });
}


/**
 * Get APP_INFO from a SERVER_LIST (from INFO_NODE).
 *   This function will asign @runtime_config.job_to_run.app as APP_INFO will
 * Params:
 *   @host {string} IP of the server where the app is running on
 *   @appname {string} Name of the app (defined in INFO_NODE)
 *   @serverListYml {string} YAML string that was got from INFO_NODE
 */
/*--------------------------------------
2017-04-02
CO THE KHONG DUNG CHO DEPLYER
SAU KHI XONG DEPLOYER THI KIEM TRA LAI HAM NAY
NEU KHONG CON SU DUNG THI XOA
-----------------------------------------
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
        callback(create_error__NoAppInfo('Cannot get APP_INFO: ' + appname));
        return;
    }
    
    // replace with below line (2017-04-01)
    ////runtime_config.job_to_run.app = appInfo;
    glob_vars.job_to_run.app = appInfo;
    
    console.log(selfname, 'INFO', 'App_info got');
    
    callback(null, appInfo);
    return appInfo;
}
--------------------------------------*/


/**
 * Get APP_INFO from INFO_NODE
 *   NOTE: When finised, @runtime_config.job_to_run.app = APP_INFO
 * @host {string} IP of the server where the app is running on
 * @appname {string} Name of the app (defined in INFO_NODE)
 * @callbakc {function} The callback function.
 */
/*--------------------------------------
2017-04-02
CO THE KHONG DUNG CHO DEPLYER
SAU KHI XONG DEPLOYER THI KIEM TRA LAI HAM NAY
NEU KHONG CON SU DUNG THI XOA
-----------------------------------------
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
                callback (err); //forward error
            }
            else {
                callback(null, data[1]);
            }
        }
    );
}
--------------------------------------*/


/**
 * Get the location of worker (module).
 * If not match any worker, return the path of common_worker.
 * Params:
 *   @workerType {string} Type of the worker
 */
function get_worker_location_str(workerType) {
    let ctlerLocation = MODNAME_CONTROLER_PATH 
        + workerType.toLowerCase() + '_controller.js';
    if(fs.existsSync(ctlerLocation)) {
        return ctlerLocation;
    }
    return MODNAME_CONTROLER_PATH + 'common_controller.js';
}


/**
 * Do one JOB
 * Params:
 *   @jobObj: Job to do
 */
function do_one_job(jobObj, callback) {
    const selfname = MODULE_NAME + '.do_one_job';
    const debug_logger = require('debug')(selfname);

    if(!jobObj) {
        console.log(selfname, "[WARN]", "No job to run.");
        callback(create_error__NoJobToRun('No job to run.'));
        return;
    }
    
    debug_logger('[DEBUG]', 'params @job_object: ', JSON.stringify(jobObj));
    
    
    if(!jobObj.content) {
        console.log(selfname, "[WARN]", "No task in Job (no tasks obj).");
        callback(create_error__JobWithNoContent('No task in Job.'));
        return;
    }
    
    if(!jobObj.content.tasks) {
        console.log(selfname, "[WARN]", "No task in Job (no tasks obj).");
        callback(create_error__JobWithNoTask('No task in Job.'));
        return;
    }
    if(jobObj.content.tasks.length == 0) {
        console.log(selfname, "[WARN]", "No task in Job (tasks.length = 0).");
        callback(create_error__JobWithNoTask('No task in Job.'));
        return;
    }
    
    let taskFuncList = createTaskList(jobObj.content.tasks);
    
    async.series(
        taskFuncList,
        (err, data) => {
            if(err) {
                callback(err); //forward the error
            }
            else {
                debug_logger('Finish JOB with SUCCESS');
                debug_logger('@data = ' + data);
                callback(null, true);
            }
        }
    );
    
    //-- Sub functions ------------------------------------------
    function createModulePath(moduleName) {
        let MOD_ROOT_PATH = './ok_modules/';
        return MOD_ROOT_PATH + moduleName + '.js';
        // require(controllerPath);
    }
    
    /**
     * Create and array-of-task-functions to send to async.series
     */
    function createTaskList(tasks) {
        const debug_logger = require('debug')(selfname + '.createTaskList');
        
        let funcArr = [];
        
        for (let i in tasks) {
            let task = tasks[i];
            let modulePath = createModulePath(task.module);
            let worker = require(modulePath);
            
            debug_logger('@task = ' + JSON.stringify(task));
            debug_logger('@modulePath = ' + modulePath);
            
            // Add worker.run function to function-array
            funcArr.push(async.apply(worker.run, task.params));
        }
        
        return funcArr;
    }
}


/**
 * Do JOB
 * Job is stored in {runtime_config.job_to_run}
 * @callback {function} function to callback
 */
function do_job(node_name, callback) {
    const selfname = MODULE_NAME + '.do_job';
    const debug_logger = require('debug')(selfname);

    debug_logger('DEBUG', 'Function START');
    
    // CHECK BEFORE RUN
    if (!glob_vars.job_to_run) {
        console.log(selfname, 'NO RUN');
        callback(create_error__NoSelectedJob('No selected job'));
        return;
    }
    console.log(selfname, 'Job to run: ', glob_vars.job_to_run);
    
    // glob_vars.job_to_run = {
    //      job_full_name: '1491733001__1491758160',
    //      created_epoch: '1491733001',
    //      time_to_run: '1491758160',
    //      content: 'abcabc'
    //}
    
    async.series(
        [
            async.apply(do_one_job, glob_vars.job_to_run)
        ],
        (err, data) => {
            if (err) {
                console.log(selfname, '[controller.do_job] get Error');
                debug_logger('DEBUG', 'Error when running, msg', '--->', data);
                callback(err); // Forward the ERROR
            }
            else {
                debug_logger('DEBUG', 'DO_JOB DATA: ', '--->', data);
                callback(null, null); //SUCCESS
            }
        }
    );
}




/*------------------------------------------------------------------------------
######## ########  ########   #######  ########  
##       ##     ## ##     ## ##     ## ##     ## 
##       ##     ## ##     ## ##     ## ##     ## 
######   ########  ########  ##     ## ########  
##       ##   ##   ##   ##   ##     ## ##   ##   
##       ##    ##  ##    ##  ##     ## ##    ##  
######## ##     ## ##     ##  #######  ##     ## 
*-----------------------------------------------------------------------------*/
function create_error__NoSelectedJob(errMsg) {
    return common_utils.create_error('14000', errMsg);
}

function create_error__CannotCreateJobObject(errMsg) {
    return common_utils.create_error('14001', errMsg);
}

function create_error__NoJobToRun(errMsg) {
    return common_utils.create_error('14002', errMsg);
}

function create_error__JobWithNoTask(errMsg) {
    return common_utils.create_error('14003', errMsg);
}

function create_error__JobWithNoContent(errMsg) {
    return common_utils.create_error('14004', errMsg);
}


/*
 ____              
|  _ \ _   _ _ __  
| |_) | | | | '_ \ 
|  _ <| |_| | | | |
|_| \_\\__,_|_| |_|
===========================================
*/
function run(callback) {
    const selfname = MODULE_NAME + '.run';
    const debug_logger = require('debug')(selfname);

    
    debug_logger('Init @runtime_config');
    glob_vars = {}; //Reset runtime config

    debug_logger('Run main process (waterfall)');
    async.waterfall(
        [
            //1. Lay 1 JOBS
            get_one_job,
            //2. Move node to RUNNING_QUEUE
            sub_run_move_node_before_run,
            update_job_status_to_running,
            //3. Thuc hien JOB o buoc 1 ---> job_result
            do_job
        ],
        //4. Move JOB vao DONE_QUEUE (SUCCESS or FAIL QUEUE)
        run_async_final
    );

    // --------------------------------------------------
    // Sub functions Area
    // --------------------------------------------------
    function move_node_show_err(err) {
        if (err) {
            debug_logger('Move node fail');
        }
        else {
            debug_logger('Move node success');
        }
    }
    
    function run_async_final(err, result) {
        process_running_result(err, result);
        
        if(err) {
            //callback(err);
            if(common_utils.is_fatal_error(err)) {
                callback(err); //Forward the error
            } 
            else {
                // Continue running if not FATAL error
                debug_logger('Not a fatal error ---> continue running');
                callback(null, true);
            }
        }
        else {
            callback(null, result);
        }

        //----------------------------------------------------------------
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
                    callback(err); //forward the ERROR
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
            let des_path = running_job_path + '/' + node_name;
            sub_run_move_node(node_name, src_path, des_path, callback);
        }
        else {
            callback(null, node_name); //For next step (waterfall)
        }
    }
    
    // using in async.waterfall
    function sub_run_move_node_after_run_fail(node_name, callback) {
        // Move node
        let src_path = running_job_path + '/' + node_name;
        let des_path = fail_job_path + '/' + node_name;
        sub_run_move_node(node_name, src_path, des_path, callback);
    }
    
    // using in async.waterfall
    function sub_run_move_node_after_run_success(node_name, callback) {
        // Move node
        let src_path = running_job_path + '/' + node_name;
        let des_path = success_job_path + '/' + node_name;
        sub_run_move_node(node_name, src_path, des_path, callback);
    }
    
    function update_job_status_to_running(node_name, callback) {
        if (node_name) {
            glob_vars.is_job_running = true;
        }
        callback(null, node_name);
    }
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