# App config
export OK_ZK_HOST='127.0.0.1'
export OK_ZK_PORT='2181'
export OK_ZK_MAIN_CONF='/danko/conf'
export OK_ZK_APPNAME='dataprocessor' #DO NOT CHANGE THIS VALUE
export OK_LOGFILE='./logs/danko.log'
export OK_PID_FILE='./pid.txt'

# For debug
export DEBUG=* #for debug module (https://www.npmjs.com/package/debug)
./node OK_DataProcessor.js