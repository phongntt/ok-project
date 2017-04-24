const fs = require('fs');
const ssh2 = require('ssh2');

/**
 * Send a file to server, using SSH
 * Params:
 *   @ssh_config: config_object that contain information for SSH connect
 *   @local_file: local file that need to send to server
 *   @remote_file: file path on remote server
 *   @callback: callback function for async call
 * 
 * Callback error code:
 *   - 1: SFPT Starting error
 *   - 2: SFPT Starting error
 * 
 * Callback Output data:
 *	{
 *  	local_file: "path_at_local",
 *		remote_file:  "path_at_remote"
 *	}
 */
function ssh_send_file(ssh_config, local_file, remote_file, callback) {
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
	                var readStream = fs.createReadStream(local_file);
	                var writeStream = sftp.createWriteStream(remote_file);
	 
	                // what to do when transfer finishes
	                writeStream.on(
	                    'close',
	                    function () {
	                        console.log( "- file transferred" );
	                        sftp.end();
	                        conn.end();
	                        //process.exit( 0 );

	                        callback(null, {
	                        	local_file: local_file,
	                        	remote_file: remote_file
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
 *					local_file: "file to send",
 *					remote_file: "file at remote"
 *      }
 *   @callback: callback function for async call
 * 
 * Callback error code:
 *   - 1: SFPT Starting error
 *   - 2: SFPT Starting error
 * 
 * Callback Output data:
 *	{
 *  	local_file: "path_at_local",
 *		remote_file:  "path_at_remote"
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

  ssh_send_file(ssh_config, paramsObj.local_file, paramsObj.remote_file, callback);

  return;
}

exports.run = run;