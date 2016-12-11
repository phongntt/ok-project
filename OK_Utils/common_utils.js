/*************************************************************
 * Module: ok-project.OK_Utils.common_utils
 * Creator: Nguyen Tran Tuan Phong
 * Create date: 2016-11-18
 * Desc: Suppport common function for all OK-Project component
 ************************************************************/

'use strict';

var winston = require('winston'); //for logging
var logger = winston;


/*---------------------------------------------------------------------
######## ##     ## ##    ##  ######  ######## ####  #######  ##    ##  ######  
##       ##     ## ###   ## ##    ##    ##     ##  ##     ## ###   ## ##    ## 
##       ##     ## ####  ## ##          ##     ##  ##     ## ####  ## ##       
######   ##     ## ## ## ## ##          ##     ##  ##     ## ## ## ##  ######  
##       ##     ## ##  #### ##          ##     ##  ##     ## ##  ####       ## 
##       ##     ## ##   ### ##    ##    ##     ##  ##     ## ##   ### ##    ## 
##        #######  ##    ##  ######     ##    ####  #######  ##    ##  ######  
---------------------------------------------------------------------*/

/**
 * Check if @epoch is expried.
 * @epoch {number} Epoch time to check
 * @expiredSeconds {number} Expried period by second
 * @return {boolean} This function will return TRUE if @expiredSeconds is zero
 *     or @epoch is expied.
 */
function is_epoch_expired(epoch, expiredSeconds) {
    let currentdate = new Date();
    let currentdate_epoch = (currentdate.getTime()-currentdate.getMilliseconds())/1000;

    // @expiredSeconds === 0 mean never expired
    let returnValue = (expiredSeconds != 0 && currentdate_epoch - epoch >= expiredSeconds);
    
    return returnValue;
}


/**
 * Get current datetime as epoch (by second)
 * @return {number} epoch of current datetime
 */
function get_current_time_as_epoch() {
    let currentdate = new Date();
    let currentdate_epoch = (currentdate.getTime()-currentdate.getMilliseconds())/1000;
    return currentdate_epoch;
}


/**
 * Check if @value is null then return @default, else return @value
 **/
function if_null_then_default(value, default_value) {
    if (value !== null) {
        return value;
    }
    return default_value;
}


function find_obj_in_array_by_property_value(arr, property_name, property_value) {
    for (var i in arr) {
        var item = arr[i];
        if(item[property_name] == property_value) {
            return item;
        }
    }
    
    return null;
}


function set_child_dict_property(parent_dict, childname, property_name, property_value) {
    if(!parent_dict[childname]) {
        parent_dict[childname] = {};
    }
    parent_dict[childname][property_name] = property_value;
}


function status_to_num(status) {
    if(status == 'OK') {
        return 1;
    }
    if(status == 'WARN') {
        return 2;
    }
    if(status == 'FAIL') {
        return 3;
    }
    return 9999; //UNKNOWN
}


function num_to_status(status_num) {
    if(status_num == 1) {
        return 'OK';
    }
    if(status_num == 2) {
        return 'WARN';
    }
    if(status_num == 3) {
        return 'FAIL';
    }
    return 'UNKNOWN'; //UNKNOWN
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
/**
 * Create a new Error object with code and message
 * 
 * Params:
 *   @errCode: the error code
 *   @errMsg: the error message
 */
function create_error(errCode, errMsg) {
    let err = new Error(errMsg);
    err.code = errCode;
    return err;
}

function create_error__PID_file(errMsg) {
    return create_error('0004', errMsg);
}

function create_error__config_from_ZK(errMsg) {
    return create_error('0003', errMsg);
}

function create_error__ZK_read_node_data(errMsg) {
    return create_error('1001', errMsg);
}

function create_error__finalize_ephemeral_node(errMsg) {
    return create_error('1500', errMsg);
}




/*
 _                
| |    ___   __ _ 
| |   / _ \ / _` |
| |__| (_) | (_| |
|_____\___/ \__, |
            |___/ 
===========================================
*/
function set_logger(new_logger) {
    logger = new_logger;
}

function logging_config(filename) {
    logger = new(winston.Logger)({
        transports: [
            new(winston.transports.File)({filename: filename})
        ],
        level: 'debug'
    });
}

function write_log(log_level, command, result, msg) {
    var log_obj = {
        timestamp: new Date().toISOString(),
        app_name: 'DANKO',
        command: command,
        result: result,
        message: msg
    };
    logger.log(log_level, log_obj);
}

function write_console(module, msg) {
    //template: <TIMESTAMP> [MODULE] --{ MESSAGE }--
    console.log('<%s> [%s] --{ %s }--', new Date().toISOString(), module, msg);
}


/**
 * Create PID file
 * 
 * Params:
 *   @filepath: the path of PID file (path and filename)
 *   @callback: function (@err, @is_file_created)
 *     @is_file_created: SUCCESS ---> true / FAIL ---> false
 */
function create_pid_file(filepath, callback) {
    let fs = require('fs');

    if (fs.existsSync(filepath)) {
        callback('PID file exists');
        return;
    } 
    
    // Write PID file ì not exists
    let pid = process.pid;
    fs.writeFile(filepath, pid, function(err) {
        if(err) {
            console.log('ERROR', 'Save PID to file get error', err);
            callback(err);
            return;
        }
    
        console.log("The PID file was saved!");
        callback(null, true);
    }); 
}


exports.set_logger = set_logger;
exports.logging_config = logging_config;
exports.write_log = write_log;
exports.is_epoch_expired = is_epoch_expired;
exports.get_current_time_as_epoch = get_current_time_as_epoch;
exports.if_null_then_default = if_null_then_default;
exports.find_obj_in_array_by_property_value = find_obj_in_array_by_property_value;
exports.set_child_dict_property = set_child_dict_property;
exports.status_to_num = status_to_num;
exports.num_to_status = num_to_status;
exports.write_console = write_console;
exports.create_pid_file = create_pid_file;
exports.create_error = create_error;