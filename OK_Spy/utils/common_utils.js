'use strict'

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

function check_expression_valid(expr_str) {
    var check_str = expr_str.replace(/{{[a-zA-Z0-9_.]+}}/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/&&/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/||/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/\(/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/\)/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/\s/g, '');
    //console.log('check_str = %', check_str);
    return check_str.length == 0;
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



exports.check_expression_valid = check_expression_valid;
exports.set_logger = set_logger;
exports.logging_config = logging_config;
exports.write_log = write_log;
exports.is_epoch_expired = is_epoch_expired;
exports.get_current_time_as_epoch = get_current_time_as_epoch;