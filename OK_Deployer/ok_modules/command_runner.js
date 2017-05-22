'use strict';

const ssh2 = require('ssh2');


/**
* SSH to remote machine and run the @command_string on it.
* Params:
* @command_string: command to run on remote machine
*	@processor: an object to process the result of command.This contain 2 properties
*	{
*	  connection: will be set by this fuction. This value is the SSH connection that this function opened.
*	  process_function: the function used to process the STREAMS of EXEC function.
*	}
**/
function ssh_connect_execute(ssh_config, command_tring, processor) {
  const debug_logger = require('debug')('command_runner.ssh_connect_execute');
  
	let conn = new ssh2();

	conn.on(
	    'connect',
	    function () {
	        debug_logger("DBEUG", "- connected" );
	    }
	);
	 
	conn.on(
	    'ready',
	    function() {
	    	processor.connection = conn;
			conn.exec(command_tring, processor.process_function);
		}
	);
	 
	conn.on(
	    'error',
	    function (err) {
	        debug_logger("DBEUG", "- connection error: %s", err );
	        conn.end();
	    }
	);
	 
	conn.on(
	    'end',
	    function () {
	        debug_logger("DBEUG", "- connection ended");
	    }
	);
	 
	conn.connect(ssh_config);
}

function ssh_run_command(ssh_config, command, callback) {
  const debug_logger = require('debug')('command_runner.ssh_run_command');
  
	let processor = {};
	let exeData = {
	  stdout: '',
	  stderr: '',
	  exit_code: -999999,
	  exit_signal: -999999
	};

	processor.process_function = function(err, stream)  {
		if(err) {
			callback(err); //Forward the ERROR
			return;
		}

    stream.on('data', function(data) {
      ////debug_logger('STDOUT: ' + data);
      exeData.stdout += data;
    });
    
    stream.stderr.on('data', function(data) {
      ////debug_logger('STDERR: ' + data);
      exeData.stderr += data;
    });

		stream.on('close', function(code, signal) {
			debug_logger('Exited with code ' + code + ' | signal: ' + signal);
			debug_logger('STDOUT: ' + exeData.stdout);
			debug_logger('STDERR: ' + exeData.stderr);
			processor.connection.end();
			callback(null, exeData);
		});
	};

	ssh_connect_execute(
		ssh_config, 
		command, 
		processor
	);
}


/**
 * Function "run"
 * This is MAIN function of ALL OK_Deployer Module
 * Params:
 *   @paramsObj: Object that contains all param sent to function
 *      {   host: "192.168.8.110", 
 *          port: 22,
 *          username: "user",
 *					command: "command to run",
 *      }
 *   @callback: callback function for async call
 * 
 * Callback error code:
 *   Forward the error from SSH2 module
 * 
 * Callback Output data:
 *	{
 *    stdout: "stdout at remote",
 *		stderr: "stderr ot remote"
 *  	exit_code: value_of_exit_code
 *  	exit_signal: value_of_exit_code
 *	}
 */
function run(paramsObj, callback)
{
  const debug_logger = require('debug')('command_runner.run');
  
  debug_logger('Start to run');
  debug_logger('@paramsObj:');
  debug_logger(paramsObj);
  
  let passphrase = process.env.PASSPHRASE;
  let privateKey = process.env.PRIVATE_KEY;

  let ssh_config = {
        "host": paramsObj.host,
        "port": paramsObj.port,
        "username": paramsObj.username,
        "privateKey": require('fs').readFileSync(privateKey),
        "passphrase": passphrase
    };

  ssh_run_command(ssh_config, paramsObj.command, callback);

  return;
}

exports.run = run;