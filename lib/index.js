function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
var getActualPath = function getActualPath(baseUrl, fileIfm, params) {
  var str = baseUrl;
  var char = '?';
  var urlParams = {
    chunkNum: fileIfm.chunkNum,
    fileName: fileIfm.extend.fileName,
    fileKey: fileIfm.key
  };

  // 合并参数
  for (var key in params) {
    urlParams[key] = params[key];
  }

  // 合并URL
  for (var _key in urlParams) {
    str += char + _key + '=' + urlParams[_key];
    char = '&';
  }

  return str;
};

// 获取返回地址
var getUploadedPosition = function getUploadedPosition(options, fileIfm, params, cb) {
  var xhr = new XMLHttpRequest();
  var data = new FormData();
  data.append('fileKey', fileIfm.key);
  data.append('fileSize', fileIfm.extend.fileSize);
  data.append('chunkSize', options.chunkSize);
  for (var key in params) {
    data.append(key, params[key]);
  }
  xhr.open('post', options.isExistPath, true);
  xhr.onload = function (e) {
    if (xhr.status === 200) {
      var back = JSON.parse(xhr.responseText);
      cb(back.code, back.data);
    } else {
      cb(-1, -1);
    }
  };
  xhr.send(data);
};

var mergeFile = function mergeFile(options, fileIfm, params, obj) {
  var xhr = new XMLHttpRequest();
  var curParams = {
    fileKey: fileIfm.key,
    fileSize: fileIfm.extend.fileSize,
    fileName: fileIfm.extend.fileName,
    chunkNum: fileIfm.chunkNum

    // 合并Key
  };for (var key in params) {
    curParams[key] = params[key];
  }

  var data = new FormData();
  for (var _key2 in curParams) {
    data.append(_key2, curParams[_key2]);
  }
  xhr.open('post', options.mergePath, true);
  xhr.onload = function (e) {
    if (xhr.status === 200) {
      var back = JSON.parse(xhr.responseText);
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

var Weaver = function () {
  function Weaver(config) {
    _classCallCheck(this, Weaver);

    // 配置项
    this.options = {
      chunkSize: 2097152,
      maxFileSize: 1024 * 1024 * 1024 * 80,
      uploadPath: '',
      isExistPath: '',
      mergePath: ''
    };

    // 合并配置项
    for (var key in this.options) {
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


  Weaver.prototype.handleFile = function handleFile(file) {
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
  };

  Weaver.prototype.uploadStatus = function uploadStatus(type) {
    this.status.cancel = type;
  };

  // 循环上传


  Weaver.prototype.loopUpload = function loopUpload(params, actualPath, chunkingNum, obj) {
    var _this = this;

    var xhr = new XMLHttpRequest();
    var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
    var start = chunkingNum * this.options.chunkSize;
    var end = start + this.options.chunkSize;
    var isLast = false;
    var block = null;
    var url = actualPath + '&chunkIndex=' + chunkingNum;

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
    xhr.upload.onprogress = function (e) {
      var progressPercent = (start + e.loaded) / _this.fileIfm.extend.fileSize * 100;
      obj.progress && obj.progress(progressPercent);
    };

    xhr.onload = function (e) {
      // console.log('第' + (chunkingNum + 1) + "块上传成功,总共" + fm.chunkNum + "块");
      if (xhr.status === 200) {
        var back = JSON.parse(xhr.responseText);
        if (back.code !== 0) {
          obj.error && obj.error(-1, back.message ? back.message : '上传失败');
        } else {
          if (isLast) {
            obj.success && obj.success(0);
            obj.progress && obj.progress(100);
            mergeFile(_this.options, _this.fileIfm, params, obj);
          } else {
            if (!_this.status.cancel) {
              _this.loopUpload(params, actualPath, chunkingNum + 1, obj);
            } else {
              _this.status.timer = setInterval(function () {
                if (!_this.status.cancel) {
                  clearInterval(_this.status.timer);
                  _this.loopUpload(params, actualPath, chunkingNum + 1, obj);
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
  };

  // 开始上传


  Weaver.prototype.beginUpload = function beginUpload(params, obj) {
    var _this2 = this;

    var actualPath = getActualPath(this.options.uploadPath, this.fileIfm, params);
    this.uploadStatus(false);
    clearInterval(this.status.timer);
    getUploadedPosition(this.options, this.fileIfm, params, function (code, index) {
      if (index === -1) {
        obj.progress && obj.progress(100);
        _this2.uploadStatus(false);
        mergeFile(_this2.options, _this2.fileIfm, params, obj);
      } else {
        _this2.loopUpload(params, actualPath, index, obj);
      }
    });
  };

  return Weaver;
}();

export default Weaver;