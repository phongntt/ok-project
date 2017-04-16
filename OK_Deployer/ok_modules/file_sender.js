/**
 * Function "run"
 * This is MAIN function of ALL OK_Deployer Module
 * Params:
 *   @paramsObj: Object that contains all param sent to finction
 *      {param1: value1, param2: value2, ...}
 */
function run(paramsObj, callback)
{
  const debug_logger = require('debug')('file_sender.run');
  
  debug_logger('Start to run');
  debug_logger('@paramsObj:');
  debug_logger(paramsObj);
  
  callback(null, true);

  return;
}

exports.run = run;