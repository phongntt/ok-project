/**
 * This is Controller using for Apache Tomcat
 */

/**
 * Dieu kien de tomcat_controller co the dieu khien duoc ung dung:
 * - Ung dung phai duoc cau hinh luu PID vao file text dat tai thu muc goc cua tomcat.
 *     Controller se kill -9 PID nay
 * 
 * - Can phat trien them:
 *   Neu file PID khong ton tai ---> tim PID theo location
 *   Goi lenh "bin/shutdown.sh -force" ---> cho 30s ---> Kill -9 neu PID van con
 * 
 * Basic Commands:
 * - stop
 * - kill_9
 * - start
 * - restart
 */

'use strict'

const async = require("async");
const spawn = require('child_process').spawn;

const module_name = 'common_controller';


function start(commandObj, callback) {
    const selfname = '[' + module_name + '.start]';
    console.log(selfname, 'DEBUG', 'Start to run');
    let shCmd = commandObj.app.commands.start;
    spawn(shCmd, {detached: true});
    callback(null, '[START] Success.');
}


function stop(commandObj, callback) {
    const selfname = '[' + module_name + '.stop]';
    console.log(selfname, 'DEBUG', 'Start to run');
    let shCmd = commandObj.app.commands.stop;
    spawn(shCmd, {detached: true});
    callback(null, '[STOP] Success.');
}


function restart(commandObj, callback) {
    // STOP first. And START if STOP is success.
    async.waterfall(
        stop,
        (stopSuccess, callback) => {
            if(!stopSuccess) {
                callback('[RESTART]', 'Fail when call STOP command.');
            }
            else {
                start(commandObj, callback);
            }
        }
    );
}


/**
 * Every type of Controller must have the {run} function
 *   This function will be call by OK_Attacker.controller to run a job.
 * @commandObj {object} storing information about command to run as below
 *   This is @runtime_config.job_to_run
 * @return {boolean} "true" when success; "false" when fail
 */
function run(commandObj, callback) {
    const selfname = '[' + module_name + '.run]';

    console.log(selfname, '[INFO]', 'RUN');
    console.log(selfname, '[DEBUG]', '---------------------------------------');
    console.log(selfname, '[DEBUG]', 'commandObj =', commandObj);
    
    let cmd = commandObj.command.toLowerCase();
    if (cmd === 'start') {
        console.log(selfname, '[DEBUG]', 'Run START command');
        start(commandObj, callback);
    }
    else if (cmd === 'stop') {
        console.log(selfname, '[DEBUG]', 'Run STOP command');
        stop(commandObj, callback);
    }
    else if (cmd === 'restart') {
        console.log(selfname, '[DEBUG]', 'Run RESTART command');
        restart(commandObj, callback)
    }
    else {
        console.log(selfname, '[DEBUG]', 'Not supprt command "' + cmd + '"');
        callback(null, 'Command "' + cmd + '" is not supported')
    }
}

exports.run = run;