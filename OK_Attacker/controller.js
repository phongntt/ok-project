"use strict";

const async = require("async");
const YAML = require('yamljs');
const zookeeper = require('node-zookeeper-client');

//OK_Project utils
const common_utils = require('./utils/common_utils');
const zk_helper = require('./utils/zk_helper');

const module_name = 'controller';

const done_job_prefix = 'DONE';
const job_name_separator = '_';

/*---------------------------------------------------------------------
##     ##    ###    ########  
##     ##   ## ##   ##     ## 
##     ##  ##   ##  ##     ## 
##     ## ##     ## ########  
 ##   ##  ######### ##   ##   
  ## ##   ##     ## ##    ##  
   ###    ##     ## ##     ##  
---------------------------------------------------------------------*/

var config = {zk_server: {host: '127.0.0.1', port: 2181}, log_file: './logs/danko.log'};
var runtime_config = null;


const const_danko_queue_path = '/danko/attacker/' + process.env.NODE_HOST_IP;
const const_alive_path = '/danko/monitor/attacker_' + process.env.NODE_HOST_IP;

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
function init_by_conf(config, callback) {
    const mkdirp = require('mkdirp');
    const path = require('path');
    
    const selfname = '[' + module_name + '.init_by_conf] ';

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
                const_danko_queue_path
            )
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


function zk_create_client(callback) {
    const timeout_second = 5;
    const selfname = '[' + module_name + '.zk_create_emphemeral_node] '
    
    zk_client = zookeeper.createClient(config.zk_server.host + ':' + config.zk_server.port);
    
    let timer = null;
    
    zk_client.once('connected', function () {
        // Xoa time-out check
        if(timer) {
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

function create_alive_node(callback) {
/* Create a Node to let other know that this process is alive. */    
    const selfname = '[' + module_name + '.create_alive_node] '

    zk_client.create(const_alive_path, zookeeper.CreateMode.EPHEMERAL, (error) => {
        if (error) {
            console.log(selfname + 'Failed to create ALIVE_NODE: %s due to: %s.', const_alive_path, error);
            callback(true); // ERROR
        } else {
            console.log(selfname + 'ALIVE_NODE created SUCCESS: %s', const_alive_path);
            callback(null, true); //SUCCESS
        }
    });
}

function load_config_from_file(filename) {
    config = YAML.load(filename);
    return config;
}

function do_config(config, callback) {
    common_utils.logging_config(config.log_file);
    common_utils.write_log('info', 'load_config', 'SUCCESS', 'Main config loaded!');
    callback(null, true); //Always SUCCESS
}


function write_result_data_to_zk(host, port, path, callback) {
// @ Async Compatible
    var result_data = YAML.stringify(run_result);
    async.series([
            async.apply(zk_helper.zk_set_node_data, host, port, path, result_data)
        ], 
        function (err, data) {
            if (err) {
                console.log('Cannot write RUNNING RESULT because of error: %s', err);
                common_utils.write_log('info', 'controller.write_result_data_to_zk', 'FAILED', 
                        {host: host, port: port, path: path, msg: 'Get Error when writting RUNNING RESULT'});
                callback(err);
            }
            else {
                console.log('RUNNING RESULT wrote:\n%s', result_data);
                common_utils.write_log('info', 'controller.write_result_data_to_zk', 'FAILED', 
                        {host: host, port: port, path: path, msg: 'Success writting RUNNING RESULT'});
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
    const selfname = '[' + module_name + '.get_one_job]';

    ////let currentdate = new Date();
    ////let currentdate_epoch = (currentdate.getTime()-currentdate.getMilliseconds())/1000;
    ////console.log(selfname, 'EPoch = ', currentdate_epoch);

    zk_helper.zk_get_children(config.zk_server.host, config.zk_server.port, const_danko_queue_path,
        (err, jobs) => {
            if(err) {
                callback(err);
            }
            else {
                console.log(selfname, 'All Jobs = ', JSON.stringify(jobs));
               
                let minTime = -1;
                let selectedJob = null;

                for (let i in jobs) {
                    let job_name = jobs[i];
                    console.log(selfname, 'Processing Job:', job_name);
                    
                    let job_name_parts = job_name.split(job_name_separator);
                    // Bo qua nhung Jon da thuc hien xong (DONE_xxxxx)
                    if(job_name_parts[0] != done_job_prefix) {
                        let time_part = job_name_parts[1];
                        console.log(selfname, selfname, 'Time part:', time_part);
                        
                        if(minTime == -1 || time_part < minTime) {
                            minTime = time_part;
                            selectedJob = job_name;
                            console.log(selfname, 'temp Job: ', selectedJob, ', epoch = ', minTime);
                        }
                    }
                    else {
                        console.log(selfname, 'Job done before ---> Ignored');
                    }
                }
               
                if (minTime != -1) { 
                    runtime_config.job_to_run = selectedJob;
                    console.log(selfname, 'Selected Job: ', runtime_config.job_to_run, ', epoch = ', minTime);
                }
                else {
                    console.log(selfname, 'No selected Job.');
                }
                
                callback(null, selectedJob);
            }
        });
}


function do_job(callback) {
/* Run selected Job*/
    const selfname = '[' + module_name + '.get_one_job]';
    console.log(selfname, 'Job to run: ', runtime_config.job_to_run);
    
    const cmder = require("./ok_modules/tomcat_controller.js");
    
    ////let job_detail = {};
    
    let job_parts = runtime_config.job_to_run.split(job_name_separator);
    let app_name = job_parts[0];
    let command = job_parts[2];
    console.log(selfname, '---> ', '{app_name:', app_name, ', command:', command, '}');
    
    cmder.stop(app_name);
    
    callback(null, true);
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
	
function run_async_final(err, result) {
	if (err) {
		console.log('Controller.Run --> Error: %s', err);
	}
	else {
		console.log('Controller.Run --> Success');
	
        // Kiem tra + dat loop time
        if (config.sleep_seconds) {
            if(config.sleep_seconds > 0) {
                setTimeout(run, parseInt(config.sleep_seconds) * 1000);
                console.log('Next loop will be run at next %s second(s)', 
                        parseInt(config.sleep_seconds));
            }
        }
        else {
            console.log('No Loop. ENV_VAR: "NODE_OKATK_SLEEP_SEC" not exists yet!');
        }
	}
}

function run() {
    //var alive_path = const_danko_alive_path + config.zk_server.conf_name;
    
    runtime_config = {};
	
	async.series (
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
			//2. Thuc hien JOB o buoc 1 ---> job_result
			do_job,
			//2'. Print job_result to consile
			//3. Xoa JOB
			//4. Tao Job moi voi ten DONE_<job name>
			//5. Ghi job_result vao Job tao o buoc 4 (yaml)
			
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
