(function (module) {
    'use strict';
    module.exports = Stats;

    var directoryRegexp = /\/$/,
        statsArgs = [
            'dev', 'mode', 'nlink', 'uid', 'gid', 'rdev', 'blksize', 'ino', 'size', 'blocks', 'atim_msec', 'mtim_msec', 'ctim_msec', 'birthtim_msec', 'path'
        ];

    /* jscs: disable requireCamelCaseOrUpperCaseIdentifiers */
    function Stats(dev, mode, nlink, uid, gid, rdev, blksize, ino, size, blocks, atim_msec, mtim_msec, ctim_msec, birthtim_msec, path) {
        if (arguments.length === 1 && typeof arguments[0] === 'object') {
            return Stats.create(arguments[0]);
        }
        if (!(Stats.is(this))) {
            return new Stats(dev, mode, nlink, uid, gid, rdev, blksize, ino, size, blocks, atim_msec, mtim_msec, ctim_msec,
                birthtim_msec, path);
        }

        var entry = path;
        this.getEntry = function () {
            return entry;
        };

        /* ID of device containing file */
        this.dev = dev;
        /* inode number */
        this.mode = mode;
        /* protection */
        this.nlink = nlink;
        /* number of hard links */
        this.uid = uid;
        /* user ID of owner */
        this.gid = gid;
        /* group ID of owner */
        this.rdev = rdev;
        /* device ID (if special file) */
        this.blksize = blksize;
        /* total size, in bytes */
        this.ino = ino;
        /* blocksize for file system I/O */
        this.size = size;
        /* number of 512B blocks allocated */
        this.blocks = blocks;
        /* time of last access */
        this.atime = new Date(atim_msec);
        /* time of last modification */
        this.mtime = new Date(mtim_msec);
        /* time of last status change */
        this.ctime = new Date(ctim_msec);
        this.birthtime = new Date(birthtim_msec);
    }

    /* jscs: enable requireCamelCaseOrUpperCaseIdentifiers */

    Stats.is = function (object) {
        return object instanceof Stats;
    };

    Stats.create = function (object) {
        if (!object || typeof object !== 'object') {
            throw new Error('object is required to create a Stats');
        }
        var args = [];
        statsArgs.forEach(function (arg) {
            args.push(object[arg]);
        });
        return Stats.apply(this, args);
    };

    Stats.prototype.isDirectory = function () {
        return directoryRegexp.test(this.getEntry());
    };

    Stats.prototype.isFile = function () {
        return !directoryRegexp.test(this.getEntry());
    };

    Stats.prototype.isBlockDevice = function () {
        return false;
    };

    Stats.prototype.isCharacterDevice = function () {
        return false;
    };

    Stats.prototype.isSymbolicLink = function () {
        return false;
    };

    Stats.prototype.isFIFO = function () {
        return false;
    };

    Stats.prototype.isSocket = function () {
        return false;
    };
}(module));
