export OKSP_HOME_PATH='/home/ubuntu/workspace/node.js/apps/OK_sample_app'
export OKSP_PID_PATH='/home/ubuntu/workspace/node.js/apps/OK_sample_app/pid.txt'
export OKSP_ENV=test_environment_value

mkdir $OKSP_HOME_PATH/logs

cd $OKSP_HOME_PATH/bin
./node main.js > $OKSP_HOME_PATH/logs/ok_sample_app.log 2>$OKSP_HOME_PATH/logs/ok_sample_app.err.log  &