(function (module, util) {
    'use strict';
    function notImplemented(method) {
        throw new Error(util.format('function %s not implemented', method));
    }

    function FsInterface() {}

    var proto = {},
        interfaces = ['stat', 'mkdir', 'readdir', 'realpath', 'rmdir', 'readFile', 'writeFile', 'appendFile', 'createReadStream', 'createWriteStream', 'unlink',
            'exists', 'stat', 'lstat'];

    interfaces.forEach(function (method) {
        proto[method] = function () {
            notImplemented(method);
        };
    });

    FsInterface.prototype = proto;

    module.exports = FsInterface;
}(module, require('util')));
