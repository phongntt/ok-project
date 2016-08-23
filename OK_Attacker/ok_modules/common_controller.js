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

const module_name = 'common_controller';


function start(commandObj) {
    const selfname = '[' + module_name + '.start]';
    console.log(selfname, 'DEBUG', 'Start to run');
    let shCmd = commandObj.app.commands.start;
    console.log(selfname, 'DEBUG', 'Call command: "' + shCmd + '"');
}


function stop(commandObj) {
    const selfname = '[' + module_name + '.stop]';
    console.log(selfname, 'DEBUG', 'Start to run');
    let shCmd = commandObj.app.commands.stop;
    console.log(selfname, 'DEBUG', 'Call command: "' + shCmd + '"');
}


/**
 * Every type of Controller must have the {run} function
 *   This function will be call by OK_Attacker.controller to run a job.
 * @commandObj {object} storing information about command to run as below
 *   {
 *     name: "app_name",
 *     location: "path_to_app_instance",
 *     command: "command to do"
 *   }
 * @return {boolean} "true" when success; "false" when fail
 */
function run(commandObj) {
    const selfname = '[' + module_name + '.run]';

    console.log(selfname, '[INFO]', 'RUN');
    console.log(selfname, '[DEBUG]', '---------------------------------------');
    console.log(selfname, '[DEBUG]', 'commandObj =', commandObj);
    
    let cmd = commandObj.command.toLowerCase();
    if (cmd === 'start') {
        console.log(selfname, '[DEBUG]', 'Run START command');
        start(commandObj);
    }
    else if (cmd === 'stop') {
        console.log(selfname, '[DEBUG]', 'Run STOP command');
        stop(commandObj);
    }
    else if (cmd === 'restart') {
        console.log(selfname, '[DEBUG]', 'Run RESTART command');
        stop(commandObj);
        start(commandObj);
    }
    else {
        console.log(selfname, '[DEBUG]', 'Not supprt command "' + cmd + '"');
    }
    
    console.log(selfname, '[DEBUG]', '---------------------------------------');

    return true;
}

exports.run = run;