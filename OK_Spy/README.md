# DANKO v0.0.1

## 1. Chức năng:
Định kỳ kiểm tra để xác định trạng của ứng dụng bằng cách lấy các thông tin như:
- Process có đang chạy không?
- Log file có đang được cập nhật trong vòng 1 phút không?
- Có telnet đến các hệ thống liên quan được không?
  + DB
  + App khác
- Có kết nối đến DB được không (đăng nhập, select thử)
- Có kết nối đến app bằng JMX được không
- Lấy các thông tin từ JMX:
  + Heap Mem / Permgen Mem
  + Threads
  + Sessions

## 2. Cách thức hoạt động
Chia làm 3 giai đoạn chính:
- Lấy thông tin cấu hình (p1) - Local
...Ứng dụng này sẽ lấy thông tin cấu hình dạng YAML từ ZK Server được khai báo trong file "./conf/conf.yml"
...Cách cấu hình: xem tại mục 3.1.1
- Lấy thông tin cấu hình (p2) - ZK Server
... Lấy thông tin cấu hình từ ZK Server dựa trên cấu hình Local
- Kiểm tra tình trạng ứng dụng
...Sử dụng thông tin cấu hình lấy được để thực hiện việc kiểm tra tình trạng ứng dụng
...Cách cấu hình hoạt động: xem tại mục 3.1.2
- Gửi thông tin tình trạng lên server

## 3. Sử dụng

### 3.0 Những việc cần làm trước tiên:
Lên ZK và tạo các node để ứng dụng sử dụng
- Tạo node: /danko
- Tạo node: /danko/conf
- Tạo node: /danko/result

### 3.1 Start/Stop ứng dụng
Chạy lệnh: $>./node main.js

### 3.2 Cấu hình cho ứng dụng
Để ứng dụng có thể hoạt động, chúng ta cần cấu hình cho ứng dụng tại 2 nơi:
- Trên ứng dụng
- Trên ZK Server

#### 3.2.1 Cấu hình tại ứng dụng
Cấu hình cho ứng dụng này rất đơn giản. Chỉ cần edit file "./conf/conf.yml" và khai báo thông tin ZK Server vào đó:
```yaml
zk_server:
    host: 127.0.0.1
    port: 1234
    conf_name: ebank_internet_8_110
log_file: ./log/danko.log
```
**Giải thích:**
- zk_server.host và zk_server.port: ip/port để kết nối đến ZK Server
- zk_server.conf_name: tên config được đặt cho Danko instance này.
...Tên này còn được dùng để lấy thông tin cấu hình hoạt động (Stage, Task) từ ZK Server (lấy từ node: /danko/conf/conf_name).
...Tên này nên đặt riêng cho mõi instance. Nếu có 2 instance trùng conf_name (trên toàn hệ thống) thì 2 instance đó sẽ dùng chung một cấu hình từ ZK Server và lưu kết quả chung 1 chỗ trên ZK Server.
- log_file: đường dẫn tới file log

#### 3.2.2 Cấu hình tại ZK Server
Trên ZK serve, chúng ta cần thực hiện cấu hình tại node "/danko/conf/conf_name":
Các thông tin về quá trình kiểm tra (Stage, Task, module) như sau:
```yaml
stages:
    - 
        name: stage_1
        desc: cac viec can thuc hien trong buoc 1
        tasks:
            - 
                name: is_process_running
                desc: kiem tra process cua ung dung co dang chay, khong dua tren PID
                module:
                    name: danko_ipd_check
                    function: check
                    params:
                        - 
                            this is a string param,
                            1234
            - 
                name: can_run_db_select
                desc: kiem tra co thuc hien select tren DB duoc khong
                module:
                    name: danko_db_check
                    function: check_select
                    params:
                        tns: tns_string_here
                        username: ebanknew
                        password: {{var_name}}
                        select_sql: select 1 from dual;
    - 
        name: stage_2
        desc: cac viec thuc hien dua tren ket qua cua stage_1
        tasks:
            -
                name: can_db_connect
                desc: kiem tra co Login vao DB duoc khong
                module:
                    name: danko_db_select
                    function: check_login
                    params:
                        tns: tns_string_here
                        username: ebanknew
                        password: 1234567890
```
**Giải thích:**


### 3.3 ZK Server - Những node cần quan tâm
- /danko/conf/conf_name
- /danko/result/conf_name

## 4. Các modules
Các module mà ứng dụng đang cung có:
-

## 5. Cách tạo module mới
