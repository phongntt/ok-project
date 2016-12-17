#rm pid.txt stop.ok

# App config
export OK_ZK_HOST='127.0.0.1'
export OK_ZK_PORT='2181'
export OK_ZK_MAIN_CONF='/danko/conf'
export OK_ZK_APPNAME='Spy_127.0.0.1_1'
export OK_LOGFILE='./logs/danko.log'
export OK_PID_FILE='./pid.txt'
export OK_STOP_COMMAND_FILE='./stop.ok'

# For debug
export DEBUG=*
#./node OK_Spy.js > stdout.txt 2> stderr.txt &
./node OK_Spy.js