# OK_HeadQuater v0.0.1


## 1. Chức năng:
Trung tâm quản lý của hệ thống ứng dụng OK.


## 2. Cách thức hoạt động
Ứng dụng này sẽ kết nối trực tiếp tới ZK để thực hiện kiểm soát và ra lệnh cho các ứng dụng khác.

## 3. Sử dụng

### 3.1 Điều kiện cần
Ứng dụng này đọc config tại `/danko/conf` và `/danko/conf/headquater`.  
Do đó 2 node này phải tồn tại trên ZK khi ứng dụng này được khỏi động.

### 3.2 Start/Stop ứng dụng
Chạy lệnh:
$>./run.sh

### 3.3 Truy cập ứng dụng
Truy cập ứng dụng tại: http://www.domain.com/client
(on c9, using: https://demo-project-c9-mrwindy.c9.io/client)

Giải thích:
[www.domain.com] ---> domain triển khai ứng dụng **OK_HeadQuater**

### 3.3 Các chức năng đặc biệt
Các chức năng này được gọi bằng link trực tiếp lên server, chưa hỗ trợ client
- Thêm app:  
https://www.domain.com/server/create-app?name=aaaaa

- Xoá app:  
https://www.domain.com/server/delete-app?name=aaaaa

- Lấy node_data theo path
https://www.domain.com/server/get-conf-by-path?path=aaaaa

- Set node_data theo path
https://www.domain.com/server/set-conf-by-path
Field: path, data

Giải thích:
[www.domain.com] ---> domain triển khai ứng dụng **OK_HeadQuater**


## 4. Danh sách chức năng

### 4.1 v0.0.1
- Điều khiển (start/stop) ứng dụng
- Xem cấu hình các ứng dụng
- Xem kết quả kiểm tra theo ứng dụng
- Thêm ứng dụng mới