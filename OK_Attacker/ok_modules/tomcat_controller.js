'use strict'

const module_name = 'tomcat_controller';

function stop(name) {
    const selfname = '[' + module_name + '.stop]';

    console.log(selfname, 'Stop ', name);
    return 'Stop ' + name;
}

exports.stop = stop;
