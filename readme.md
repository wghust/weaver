### 描述

分片上传库

### 安装

```
(sudo) npm install weaver-upload --save
```

### 使用指南

```
import Weaver from 'weaver-upload';
const fileUpload = new Weaver({
  chunkSize: 2097152,  // 分片块大小
  maxFileSize: 1024 * 1024 * 1024 * 80, // 文件最大大小
  uploadPath: '',   // 上传文件地址
  isExistPath: '',  // 确认上传文件第几块地址
  mergePath: ''     // 合并地址
});

fileUpload.handleFile(file); // 插入文件
fileUpload.beginUpload(params, {
  error (code, message) {
    <!-- code为-1，message为错误信息 -->
  },
  success (code) {
    <!-- code为1表示上传并合并成功, code为0表示上传片段完毕 -->
  },
  progress (percent) {
    <!-- percent表示传输百分比 -->
  }
});
fileUpload.uploadStatus(false); // 在上传中及时阻断上传
```

### 后端接口

#### 上传文件地址 <uploadPath>

默认入参：

```
{
  <!-- 固定的参数 -->
  chunkNum: 总分片数,
  fileName: 文件名称,
  fileKey: 文件key值,
  <!-- 额外的参数，可自定义 -->
  xxx: xxx
}
```

返回参数:

```
{
  code: 状态值, 为1成功，1以外失败,
  message: 返回信息
}
```

#### 合并文件地址 <mergePath>

默认入参：

```
{
  <!-- 固定参数 -->
  chunkNum: 总分片数,
  fileName: 文件名称,
  fileKey: 文件key值,
  fileSize: 文件大小,
  <!-- 额外的参数，可自定义 -->
  xxx: xxx
}
```

返回参数：

```
{
  code: 状态值，为0成功，其他失败,
  message: 返回信息
}
```

#### 判断上传到第几块了接口地址 <isExistPath>

默认入参：

```
{
  fileKey: 文件key值，
  fileSize: 文件大小,
  chunkSize: 分片大小
}
```

返回参数：

```
{
  code: 状态值，为1成功，其他失败,
  chunkIndex: 传到第几片index,
  message: 返回信息
}
```