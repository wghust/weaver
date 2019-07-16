/**
* Author:      "zhishui",
* QQ:          "1075296345"
* Email:       "zhishui@tongbanjie.com"
* Date:        "2018-11-29 15:29:48"
* Version:     "0.1.0"
* Description: "分片上传代码"
**/

import Md5 from 'md5';

// 设置实际上url地址
const getActualPath = (baseUrl, fileIfm, params) => {
  let str = baseUrl;
  let char = '?';
  const urlParams = {
    chunkNum: fileIfm.chunkNum,
    fileName: fileIfm.extend.fileName,
    fileKey: fileIfm.key
  };

  // 合并参数
  for (const key in params) {
    urlParams[key] = params[key];
  }

  // 合并URL
  for (const key in urlParams) {
    str += char + key + '=' + urlParams[key];
    char = '&';
  }

  return str;
};

// 获取返回地址
const getUploadedPosition = (options, fileIfm, params, cb) => {
  const xhr = new XMLHttpRequest();
  const data = new FormData()
  data.append('fileKey', fileIfm.key);
  data.append('fileSize', fileIfm.extend.fileSize);
  data.append('chunkSize', options.chunkSize);
  for (const key in params) {
    data.append(key, params[key]);
  }
  xhr.open('post', options.isExistPath, true);
  xhr.onload = (e) => {
    if (xhr.status === 200) {
      const back = JSON.parse(xhr.responseText);
      cb(back.code, back.data);
    } else {
      cb(-1, -1);
    }
  };
  xhr.send(data);
};

const mergeFile = (options, fileIfm, params, obj) => {
  const xhr = new XMLHttpRequest();
  const curParams = {
    fileKey: fileIfm.key,
    fileSize: fileIfm.extend.fileSize,
    fileName: fileIfm.extend.fileName,
    chunkNum: fileIfm.chunkNum
  }

  // 合并Key
  for (const key in params) {
    curParams[key] = params[key];
  }

  const data = new FormData();
  for (const key in curParams) {
    data.append(key, curParams[key]);
  }
  xhr.open('post', options.mergePath, true);
  xhr.onload = (e) => {
    if (xhr.status === 200) {
      const back = JSON.parse(xhr.responseText);
      if (back.code === 0) {
        obj.success && obj.success(1, '合并成功');
      } else {
        obj.error && obj.error(-1, back.message);
      }
    } else {
      obj.error && obj.error(-1, '服务器出错，合并资源失败');
    }
  };
  xhr.send(data);
};

class Weaver {
  constructor (config) {
    // 配置项
    this.options = {
      chunkSize: 2097152,
      maxFileSize: 1024 * 1024 * 1024 * 80,
      uploadPath: '',
      isExistPath: '',
      mergePath: ''
    };

    // 合并配置项
    for (const key in this.options) {
      if (config[key] !== undefined && config[key] !== '') {
        this.options[key] = config[key];
      }
    }

    // 初始化文件信息
    this.fileIfm = {
      file: null,
      extend: {
        fileSize: 0,
        fileName: '',
        fileTime: ''
      },
      key: '',
      chunkNum: 0
    };

    // 上传状态
    this.status = {
      cancel: true,
      timer: null
    };

    // 请求
    // this.xhr = new XMLHttpRequest();
  }

  // 处理文件信息
  handleFile (file) {
    if (!file) {
      return false;
    }
    this.fileIfm = {
      file: file,
      extend: {
        fileSize: file.size,
        fileName: file.name,
        fileTime: file.lastModified
      },
      key: Md5(file.name + file.lastModified + file.size),
      chunkNum: Math.ceil(file.size / this.options.chunkSize)
    };
    return true;
  }

  uploadStatus (type) {
    this.status.cancel = type;
  }

  // 循环上传
  loopUpload (params, actualPath, chunkingNum, obj) {
    const xhr = new XMLHttpRequest();
    const blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
    const start = chunkingNum * this.options.chunkSize;
    let end = start + this.options.chunkSize;
    let isLast = false;
    let block = null;
    const url = actualPath + '&chunkIndex=' + chunkingNum;

    // 判断是否超出
    end = end > this.fileIfm.extend.fileSize ? this.fileIfm.extend.fileSize : end;

    // 判断是否是最后一片
    if (chunkingNum >= this.fileIfm.chunkNum - 1) {
      isLast = true;
    }

    block = blobSlice.call(this.fileIfm.file, start, end);

    // 开始上传
    xhr.open('POST', url);

    // 进度
    xhr.upload.onprogress = (e) => {
      const progressPercent = ((start + e.loaded) / this.fileIfm.extend.fileSize) * 100;
      obj.progress && obj.progress(progressPercent);
    };

    xhr.onload = (e) => {
      // console.log('第' + (chunkingNum + 1) + "块上传成功,总共" + fm.chunkNum + "块");
      if (xhr.status === 200) {
        const back = JSON.parse(xhr.responseText);
        if (back.code !== 0) {
          obj.error && obj.error(-1, back.message ? back.message : '上传失败');
        } else {
          if (isLast) {
            obj.success && obj.success(0);
            obj.progress && obj.progress(100);
            mergeFile(this.options, this.fileIfm, params, obj);
          } else {
            if (!this.status.cancel) {
              this.loopUpload(params, actualPath, chunkingNum + 1, obj);
            } else {
              this.status.timer = setInterval(() => {
                if (!this.status.cancel) {
                  clearInterval(this.status.timer);
                  this.loopUpload(params, actualPath, chunkingNum + 1, obj);
                }
              }, 50);
            }
          }
        }
      } else {
        obj.error && obj.error(-1, '上传失败');
      }
    };

    xhr.send(block);
  }

  // 开始上传
  beginUpload (params, obj) {
    const actualPath = getActualPath(this.options.uploadPath, this.fileIfm, params);
    this.uploadStatus(false);
    clearInterval(this.status.timer);
    getUploadedPosition(this.options, this.fileIfm, params, (code, index) => {
      if (index === -1) {
        obj.progress && obj.progress(100);
        this.uploadStatus(false);
        mergeFile(this.options, this.fileIfm, params, obj);
      } else {
        this.loopUpload(params, actualPath, index, obj);
      }
    });
  }
}

export default Weaver;