'use strict';

const fs = require('fs');
const ssh2 = require('ssh2');

/**
 * Send a file to server, using SSH
 * Params:
 *   @ssh_config: config_object that contain information for SSH connect
 *   @file_from: local file that need to send to server
 *   @file_to: file path on remote server
 *   @callback: callback function for async call
 * 
 * Callback error code:
 *   - 1: SFPT Starting error
 *   - 2: SFPT Starting error
 * 
 * Callback Output data:
 *	{
 *  	file_from: "path_at_local",
 *		file_to:  "path_at_remote"
 *	}
 */
function ssh_send_file(ssh_config, file_from, file_to, callback) {
  const debug_logger = require('debug')('file_sender.ssh_send_file');

	let conn = new ssh2();

	conn.on(
	    'connect',
	    function () {
	        debug_logger( "- SSH connected" );
	    }
	);
	 
	conn.on(
	    'ready',
	    function () {
	        debug_logger( "- SSH connection is ready" );
	 
	        conn.sftp(
	            function (err, sftp) {
	                if ( err ) {
	                    debug_logger( "Error: problem starting SFTP: %s", err );
	                    conn.end();
	                    callback(2); //ERROR
	                }
	 
	                debug_logger( "- SFTP started" );
	 
	                // upload file
	                var readStream = fs.createReadStream(file_from);
	                var writeStream = sftp.createWriteStream(file_to);
	 
	                // what to do when transfer finishes
	                writeStream.on(
	                    'close',
	                    function () {
	                        console.log( "- file transferred" );
	                        sftp.end();
	                        conn.end();
	                        //process.exit( 0 );

	                        callback(null, {
	                        	file_from: file_from,
	                        	file_to: file_to
	                        }); //SUCCESS
	                    }
	                );
	 
	                // initiate transfer of file
	                readStream.pipe( writeStream );
	            }
	        );
	    }

	);
	 
	conn.on(
	    'error',
	    function (err) {
	        debug_logger( "- SSH connection error: %s", err );
	        conn.end();
	        callback(1); //ERROR
	    }
	);
	 
	conn.on(
	    'end',
	    function () {
	        debug_logger("- SSH connection ended");
	    }
	);
	 
	conn.connect(ssh_config);
}


/**
 * Send a file to server, using SSH
 * Params:
 *   @ssh_config: config_object that contain information for SSH connect
 *   @file_from: file on server that need to receive
 *   @file_to: file path on local
 *   @callback: callback function for async call
 * 
 * Callback error code:
 *   - 1: SFPT Starting error
 *   - 2: SFPT Starting error
 * 
 * Callback Output data:
 *	{
 *  	file_from: "path_at_remote",
 *		file_to:  "path_at_local"
 *	}
 */
function ssh_receive_file(ssh_config, file_from, file_to, callback) {
  const debug_logger = require('debug')('file_sender.ssh_receive_file');

	let conn = new ssh2();

	conn.on(
	    'connect',
	    function () {
	        debug_logger( "- SSH connected" );
	    }
	);
	 
	conn.on(
	    'ready',
	    function () {
	        debug_logger( "- SSH connection is ready" );
	 
	        conn.sftp(
	            function (err, sftp) {
	                if ( err ) {
	                    debug_logger( "Error: problem starting SFTP: %s", err );
	                    conn.end();
	                    callback(2); //ERROR
	                }
	 
	                debug_logger( "- SFTP started" );
	 
	                // receive file
	                var writeStream = fs.createWriteStream(file_to);
	                var readStream = sftp.createReadStream(file_from);
	 
	                // what to do when transfer finishes
	                writeStream.on(
	                    'close',
	                    function () {
	                        console.log( "- file transferred" );
	                        sftp.end();
	                        conn.end();
	                        //process.exit( 0 );

	                        callback(null, {
	                        	file_from: file_from,
	                        	file_to: file_to
	                        }); //SUCCESS
	                    }
	                );
	 
	                // initiate transfer of file
	                readStream.pipe( writeStream );
	            }
	        );
	    }

	);
	 
	conn.on(
	    'error',
	    function (err) {
	        debug_logger( "- SSH connection error: %s", err );
	        conn.end();
	        callback(1); //ERROR
	    }
	);
	 
	conn.on(
	    'end',
	    function () {
	        debug_logger("- SSH connection ended");
	    }
	);
	 
	conn.connect(ssh_config);
}


/**
 * Function "run"
 * This is MAIN function of ALL OK_Deployer Module
 * Params:
 *   @paramsObj: Object that contains all param sent to function
 *      {   host: "192.168.8.110", 
 *          port: 22,
 *          username: "root",
 *					file_from: "file to send",
 *					file_to: "file at remote",
 *					is_receive: "< 1: receive / 0: send >"
 *      }
 *   @callback: callback function for async call
 * 
 * Callback error code:
 *   - 1: SFPT Starting error
 *   - 2: SFPT Starting error
 * 
 * Callback Output data:
 *	{
 *  	file_from: "path_at_local",
 *		file_to:  "path_at_remote"
 *	}
 */
function run(paramsObj, callback)
{
  const debug_logger = require('debug')('file_sender.run');
  
  debug_logger('Start to run');
  debug_logger('@paramsObj:');
  debug_logger(paramsObj);
  
  let passphrase = process.env.PASSPHASE;
  let privateKey = process.env.PRIVATE_KEY;

  let ssh_config = {
        "host": paramsObj.host,
        "port": paramsObj.port,
        "username": paramsObj.username,
        "privateKey": require('fs').readFileSync(privateKey),
        "passphrase": passphrase
    };

  if (paramsObj.is_receive == 1) {
  	ssh_receive_file(ssh_config, paramsObj.file_from, paramsObj.file_to, callback);
  }
  else {
  	ssh_send_file(ssh_config, paramsObj.file_from, paramsObj.file_to, callback);
  }
  return;
}

exports.run = run;