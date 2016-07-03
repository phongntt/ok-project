var fs = require('fs');
var moment = require('moment');

// Lay thoi gian tu lan edit sau cung toi hien tai
function is_log_file_still_update(filepath, valid_seconds) {
    try {
        var stat = fs.statSync(filepath);
        var curTime = Date.now();
        var modTime = moment.utc(stat.mtime).valueOf();
        var secs = Math.floor((curTime - modTime)/1000);
        return {is_success: true, data: secs <= valid_seconds};
    }
    catch (ex) {
        return {is_success: false, data: {exception: ex}}; //loi chua xac dinh
    }
}




exports.is_log_file_still_update = is_log_file_still_update;
