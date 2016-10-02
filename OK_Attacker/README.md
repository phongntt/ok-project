## Giới thiệu:
**OK_Attacker** là ứng dụng dùng để thực thi những lệnh cần thực hiện lên server đang chạy ứng dụng.
**OK_Attacker** sẽ nhận lệnh (Job) từ **OK_HeadQuater** cho những việc cần chạy.
Với mỗi Job cần chạy, **OK_HeadQuater** sẽ tạo 1 Node vào Queue nhận kệnh của **OK_Attacker**, tạm gọi là Job_Node.
(**OK_Attacker** chỉ chạy những Job_Node được tạo không quá một khoảng thời gian được cấu hình trước - Environment Variable: NODE_OK_ATK_DUETIME)
**OK_Attacker** sau khi thực thi xong sẽ phản hồi thông tin bằng cách cập nhật Data của Job_Node.
Sau khi **OK_HeadQuater** nhận được thông tin sẽ remove Job_Node tương ứng.

## Quá trình chạy của ứng dụng Attacker:

### Sơ lược:
Để **OK_Attacker** có thể nhận được Job từ **OK_HeadQuater**, người dùng cần tạo 1 node lên **ZK_Server** như sau:
- Node name: /danko/app_info
Nội dung Node:
```YAML
-
  host: 192.168.72.66
  apps:
    - 
      name: INTERNET_BANKING
      type: tomcat
      location: "/u02/apache-tomcat-7.0.41"
    - 
      name: COREBS
      type: jboss
      location: "/u02/jboss-eab-5.1"
      instance: dafault-khcn
-
  host: 192.168.72.80
  apps:
    - 
      name: INTERNET_BANKING
      type: tomcat
      location: "/u02/apache-tomcat-7.0.41"
    - 
      name: COREBS
      type: jboss
      location: "/u02/jboss-eab-5.1"
      instance: dafault-khcn
```
**OK_HeadQuater** sẽ dựa vào thông tin định nghĩa này để ra lệnh cho **OK_Attacker** tại server phù hợp.  
Khi có cập nhật thông tin ứng dụng trong app_info, bằng cách nào đó,
  hãy báo **OK_Attacker** chạy lệnh ```UPDATE_SERVER_INFO``` (tên app là gì cũng được) để cập nhật app_info trên **OK_Attacker**.  

Khi **OK_Attacker** được start, nó sẽ tạo 1 node có tên ```/danko/attacker/<ip>```.  
Trong đó ```<ip>``` chính là IP mà attacker đang chạy trên đó (lấy từ biến môi trường: ```NODE_HOST_IP```).

Khi gửi Job cho **OK_Attacker**, **OK_HeadQuater** sẽ kiểm tra node nhận lệnh của **OK_Attacker** tương ứng có tồn tại hay không.
  Nếu node nhận lệnh không tồn tại tương ứng với việc **OK_Attacker** không hoạt động.

Khi **OK_Attacker** được chạy, ứng dụng sẽ lặp đi lặp lại định kỳ thực hiện các công việc sau
1. Lấy thông Job cần chạy từ ZK
2. Chạy Job và lưu kết quả
3. Cập nhật kết quả lên ZK

### Chi tiết:

#### Job:
Job cần được chạy bởi Attcker, được gửi vào **ZK_Node** bởi các ứng dụng khác
(thường là từ **OK_HeadQuater**).
Mỗi Job là 1 **ZK_Node** và có tên như bên dưới:
Node name: ```AppName__epochTime__Command```

Mô tả:
```<AppName>```: Tên ứng dụng được khai báo trong Node “/danko/app_info”
```<Command>```: công việc cần thực hiện. VD: Start, Stop, Restart, ...
```<epochTime>```: thời gian tạo Job đã được chuyển đổi thành dạng epoch 

#### Kết quả chạy Job:
Kết quả sau khi chạy Job được Attcker gửi lên, được ghi thêm vào nội dung của Job_Node, cấu trúc như sau:
```JSON
{
    result: "(OK/FAIL)",
    finish_time: "yyyymmdd_hh24:mi:ss",
    detail: {
        task1: "Thong tin ve task1",
        task2: "Thong tin ve task2",
        task3: "Thong tin ve task3"
    }
}
```

### Những biến môi trường cần khai báo:
- ```NODE_ENV```: Định nghĩa môi trường:
  - Giá trị: ```DEBUG```
  - Giá trị: ```PRODUCTION```
- ```NODE_HOST_IP```: IP của server hiện tại
- ```NODE_OKATK_JOB_EXP_TIME```: thời gian hiệu lực của mỗi JOB
- ```NODE_OKATK_SLEEP_SEC```: thời gian nghĩ giữa các lần quét (tính bằng giây).
  Default=0 ---> chạy liên tục. Nếu không khai báo thì ứng dụng chỉ chạy 1 lần.
- 

### Những ZK_NODE mà ứng dụng tự động tạo
- ```/danko/attacker/<attacker_ip>```

### Những ZK_NODE mà ứng dụng cần để chạy nhưng không tự động tạo
- ```/danko/attacker/jobs```: **OK_HeadQuater** sẽ tạo
  - Đây là job_queue, chứa thông tin những JOB đang cần các Attacker thực hiện
- ```/danko/attacker/running_jobs```: **OK_HeadQuater** sẽ tạo
  - Đây là nơi chứa thông tin những JOB **đang** được **OK_Attacker** xử lý
- ```/danko/attacker/fail_jobs``` ---> **OK_HeadQuater** sẽ tạo
  - Đây là nơi chứa thông tin những JOB đã được xử lý nhưng bị FAIL
- ```/danko/attacker/success_jobs``` ---> **OK_HeadQuater** sẽ tạo
  - Đây là nơi chứa thông tin những JOB đã được thực hiện xong

## Cách viết controller

### Tổng quan:
Để đều khiển nhiều loại ứng dụng khác nhau như Tomcat, Jboss, Java Process, ...
**OK_Attacker** sử dụng những module khác nhau tương ứng với từng loại ứng dụng.
Vd: sử dụng *tomcat_controller* cho Tomcat, *jboss_controller* cho JBoss, ...  
Do đó, khi phát sinh một loại ứng dụng mới developer chỉ cần viết 1 controller 
  và đặt vào thư mục ```[OK_Attacker]/ok_modules/```.  
Module được đặt tên như sau: ```<ten loai ung dung>_contrller.js```  
Trong đó: ```<ten loai ung dung>``` là tên loại được khai báo vào **APP_INFO**.
Khi cần thực hiện các lệnh tương ứng với loại ứng dụng nào thì **OK_Attacker**
  chỉ cần ```require``` module đó. Khi không tìm thấy module của loại app tương ứng
  thì **OK_Attacker** sẽ sử dụng ```common_controller.js``` để điểu khiển.

Mỗi controller cần cung cấp ra ngòai MỘT HÀM DUY NHẤT có tên ```run```, 
  hàm này sẽ được **OK_Attacker** gọi khi muốn thực hiện một lệnh nào đó.  
