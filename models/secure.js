var key = '8350C53CC8753A8C31EE9DE8F30803812F2B5A9109129E4206DFD3131048B828';
var encryptor = require('simple-encryptor')(key);

function secure() {
  this.encrypt = function(text) {
    return encryptor.encrypt(text);
  }

  this.decrypt = function(encrypted) {
    return encryptor.decrypt(encrypted);
  }
}

module.exports = secure;
