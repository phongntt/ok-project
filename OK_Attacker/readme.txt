Cần làm:
--------------------------------------------------------------------------------
* controller
  - Viet ham lay SERVER info tu ZK ---> luu vao runtime_config.server_app_info
    + runtime_config.server_app_info.data ---> luu du lieu
    + runtime_config.server_app_info.last_update_epoch ---> luu thoi gian cap nhat
      ---> Dung de kiem tra trong truong hop can load lai thong tin sau nay
  - Ham get_app_info: can chinh sua, neu lay khong duoc thong tin app 
     thi thu update 
     ---> Khi co update thi truyen command vao JOB_NODE: ALL__epoch__UPDATE_SERVER_INFO

  - Ham "get_one_job" hien chi lay 1 JOB dua theo thoi gian tao
    ---> Can sua thanh lay moi app 1 job
    ---> Sau khi xong, can chinh ham "do_job" de ho tro chay cho nhieu app 1 luc

  - Tao SAMPLE_APP de chay thu
  
================================================================================
  
Ghi chu:
--------------------------------------------------------------------------------
* JOB Node ---> AppName__epochTime__Command
    TEST_TOMCAT_CTLR__1469354031__Command

* Attacker Node ---> /danko/attacker/192.168.8.111

* epoch example ---> 1469354011

* @runtime_config.job_to_run = {
    app_name: 'APP_NAME',
    created_epoch: epoch_time,
    command: "COMMAND",
    app: @app_info //xem ben duoi
}

* app_info = { 
    "name": 'TEST_TOMCAT_CTLR',
    "type": 'tomcat',
    "location": '/home/ubuntu/workspace/tomcat' }

* Job object to send to Controller is same as @runtime_config.job_to_run
{
    app_name: 'APP_NAME',
    created_epoch: epoch_time,
    command: "COMMAND",
    app: @app_info
}