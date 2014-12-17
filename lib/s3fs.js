(function (module, fsInterface, util, q, AWS, s3Utils, extend, S3WriteStream, Stats) {
    'use strict';
    var directoryRegExp = /\/$/,
        defaultCreateOptions = {

        };

    function S3fs(options, bucket) {
        if (!(this instanceof S3fs)) {
            return new S3fs(options, bucket);
        }
        if (!options) {
            throw new Error('credentials are required');
        }
        if (!bucket) {
            throw new Error('bucket is required');
        }
        var bucketParts = s3Utils.decomposePath(bucket);
        this.s3 = options instanceof AWS.S3 ? options : new AWS.S3(options);
        this.bucket = bucketParts[0];
        this.path = bucketParts.slice(1).join('/');
        if (this.path) {
            this.path += '/';
        }
    }

    function whiteSpace(item){
        return item;
    }

    util.inherits(S3fs, fsInterface);

    S3fs.prototype.clone = function (extend) {
        return new S3fs(this.s3, s3Utils.joinPaths(this.bucket, s3Utils.joinPaths(this.path, extend)));
    };

    S3fs.prototype.create = function (options, cb) {
        if (typeof options === 'function') {
            cb = options;
            options = undefined;
        }

        var deferred = !cb ? q.defer() : undefined,
            params = extend(true, defaultCreateOptions, options, {Bucket: this.bucket});
        this.s3.createBucket(params, function (err, data) {
            if (err) {
                return deferred ? deferred.reject(err) : cb(err);
            }
            return deferred ? deferred.resolve(data) : cb(err, data);
        });
        return deferred ? deferred.promise : undefined;
    };

    S3fs.prototype.delete = function (cb) {
        var deferred = !cb ? q.defer() : undefined,
            params = {Bucket: this.bucket};
        this.s3.deleteBucket(params, function (err, data) {
            if (err) {
                return deferred ? deferred.reject(err) : cb(err);
            }
            return deferred ? deferred.resolve(data) : cb(err, data);
        });
        return deferred ? deferred.promise : undefined;
    };

    function getFileStats(s3fs, path, cb) {
        var deferred = !cb ? q.defer() : undefined;

        // S3 doesn't return information on directories and it automatically creates any that don't exist.
        // So we can return semi-static information about the stats of a directory.
        if (directoryRegExp.test(path)) {
            process.nextTick(function () {
                /* jscs: disable requireCamelCaseOrUpperCaseIdentifiers */
                var date = new Date(),
                    stats = new Stats({
                        dev: 0,
                        ino: 0,
                        mode: 0,
                        nlink: 1,
                        uid: 0,
                        gid: 0,
                        rdev: 0,
                        size: 0,
                        atim_msec: date,
                        mtim_msec: date,
                        ctim_msec: date,
                        path: path
                    });
                /* jscs: enable requireCamelCaseOrUpperCaseIdentifiers */
                return deferred ? deferred.resolve(stats) : cb(null, stats);
            });
        } else {
            s3fs.s3.headObject({
                Bucket: s3fs.bucket,
                Key: s3fs.path + s3Utils.toKey(path, s3fs.bucket, s3fs.path)
            }, function (err, data) {
                if (err) {
                    return deferred ? deferred.reject(err) : cb(err);
                }
                /* jscs: disable requireCamelCaseOrUpperCaseIdentifiers */
                var stats = new Stats({
                    dev: 0,
                    ino: 0,
                    mode: 0,
                    nlink: 0,
                    uid: 0,
                    gid: 0,
                    rdev: 0,
                    size: Number(data.ContentLength),
                    atim_msec: data.LastModified,
                    mtim_msec: data.LastModified,
                    ctim_msec: data.LastModified,
                    path: path
                });
                /* jscs: enable requireCamelCaseOrUpperCaseIdentifiers */
                return deferred ? deferred.resolve(stats) : cb(err, stats);
            });
        }
        return deferred ? deferred.promise : undefined;
    }

    S3fs.prototype.stat = function (path, cb) {
        return getFileStats(this, path, cb);
    };

    S3fs.prototype.lstat = function (path, cb) {
        return getFileStats(this, path, cb);
    };

    function contentToKey(content) {
        return content.Key;
    }

    function contentPrefixesToPrefix(content) {
        return content.Prefix;
    }

    function listAllObjects(s3, bucket, prefix, delimiter, marker) {
        var deferred = q.defer(),
            objectPrefix = prefix === '/' ? undefined : prefix;
        s3.listObjects({
            Bucket: bucket,
            Delimiter: delimiter,
            Marker: marker,
            Prefix: objectPrefix
        }, function (err, data) {
            if (err) {
                return deferred.reject(err);
            }
            var contentsList = data.Contents;
            if (data.IsTruncated) {
                return listAllObjects(s3, bucket, prefix, delimiter, data.KeyMarker).then(function (contents) {
                    return deferred.resolve(contentsList.concat(contents));
                }, function (reason) {
                    return deferred.reject(reason);
                });
            }
            deferred.resolve(contentsList);
        });
        return deferred.promise;
    }

    S3fs.prototype.dstat = function (name, marker, cb) {
        var callback = cb || (typeof marker === 'function' ? marker : undefined);
        marker = (typeof marker === 'function' ? undefined : marker);
        var promise = listAllObjects(this.s3, this.bucket, this.path + s3Utils.toKey(name) + '/', '/', marker);
        if (!callback) {
            return promise;
        }
        promise.then(function (contents) {
            callback(null, contents);
        }, function (reason) {
            callback(reason);
        });
    };

    function listAllObjectsFiles(s3, bucket, prefix, delimiter, marker) {
        var deferred = q.defer(),
            objectPrefix = prefix === '/' ? undefined : prefix;
        s3.listObjects({
            Bucket: bucket,
            Delimiter: delimiter,
            Marker: marker,
            Prefix: objectPrefix
        }, function (err, data) {
            if (err) {
                return deferred.reject(err);
            }
            var fileList = data.Contents.map(contentToKey).concat(data.CommonPrefixes.map(contentPrefixesToPrefix)).map(function (item) {
                if (objectPrefix && item.indexOf(objectPrefix) === 0) {
                    return item.replace(objectPrefix, '');
                }

                return item;
            });
            if (data.IsTruncated) {
                return listAllObjectsFiles(s3, bucket, prefix, delimiter, data.KeyMarker).then(function (files) {
                    return deferred.resolve(fileList.concat(files));
                }, function (reason) {
                    return deferred.reject(reason);
                });
            }
            deferred.resolve(fileList.filter(whiteSpace));
        });
        return deferred.promise;
    }

    S3fs.prototype.readdir = function (name, cb) {
        var prefix =  this.path + s3Utils.toKey(name);
        if(prefix[prefix.length - 1] !== '/'){
            prefix += '/';
        }
        var promise = listAllObjectsFiles(this.s3, this.bucket, prefix, '/');
        if (!cb) {
            return promise;
        }
        promise.then(function (files) {
            cb(null, files);
        }, function (reason) {
            cb(reason);
        });
    };

    S3fs.prototype.realpath = function () {

    };

    S3fs.prototype.mkdir = function (path, cb) {
        var promise = putObject(this.s3, this.bucket, this.path + s3Utils.toKey(path) + '/');
        if (!cb) {
            return promise;
        }
        promise.then(function (response) {
            cb(undefined, response);
        }, function (reason) {
            cb(reason);
        });
    };

    S3fs.prototype.rmdir = function (path, cb) {
        var promise = deleteObject(this.s3, this.bucket, this.path + s3Utils.toKey(path) + '/');
        if (!cb) {
            return promise;
        }
        promise.then(function (response) {
            cb(undefined, response);
        }, function (reason) {
            cb(reason);
        });
    };

    S3fs.prototype.rmdirp = function (path, cb) {
        var self = this,
            promise = listAllObjectsFiles(this.s3, this.bucket, path ? this.path + s3Utils.toKey(path) + '/' : undefined).then(function (objects) {
                return q.all(objects.filter(function (object) {
                    //filter items
                    return !directoryRegExp.test(object);
                }).map(function (object) {
                    //remove all the items
                    return self.unlink((path ? self.path + s3Utils.toKey(path) + '/' : '') + object);
                }).concat(objects.filter(function (object) {
                    return directoryRegExp.test(object);
                }).map(function (object) {
                    //remove all folders
                    return self.rmdir((path ? self.path + s3Utils.toKey(path) + '/' : '') + object);
                })));
            });

        if (!cb) {
            return promise;
        }

        promise.then(function () {
            cb(null);
        }, function (reason) {
            cb(reason);
        });
    };

    S3fs.prototype.readFile = function (name, cb) {
        var deferred = !cb ? q.defer() : undefined;
        this.s3.getObject({
            Bucket: this.bucket,
            Key: this.path + s3Utils.toKey(name, this.bucket, this.path)
        }, function (err, data) {
            if (err) {
                return deferred ? deferred.reject(err) : cb(err);
            }
            return deferred ? deferred.resolve(data) : cb(err, data.Body);
        });
        return deferred ? deferred.promise : undefined;
    };

    S3fs.prototype.createReadStream = function (name) {
        return this.s3.getObject({
            Bucket: this.bucket,
            Key: this.path + s3Utils.toKey(name)
        }).createReadStream();
    };

    S3fs.prototype.createWriteStream = function (name) {
        return new S3WriteStream(this.s3, this.bucket, this.path + s3Utils.toKey(name));
    };

    function putObject(s3, bucket, key, body, options) {
        var deferred = q.defer(),
            s3Options = extend(typeof options === 'object' ? options : {}, {
                Bucket: bucket,
                Key: key,
                Body: body
            }); // S3 Put Options: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/frames.html

        s3.putObject(s3Options, function (err, data) {
            if (err) {
                return deferred.reject(err);
            }
            deferred.resolve(data);
        });
        return deferred.promise;
    }

    S3fs.prototype.writeFile = function (name, data, options, cb) {
        var callback = cb || (typeof options === 'function' ? options : undefined),
            promise = putObject(this.s3, this.bucket, this.path + s3Utils.toKey(name), data, options);
        if (!callback) {
            return promise;
        }
        promise.then(function (response) {
            callback(undefined, response);
        }, function (reason) {
            callback(reason);
        });
    };

    function deleteObjects(s3, bucket, list) {
        var keys = [];
        list.forEach(function (item) {
            var key = {
                Key: item
            };
            keys.push(key);
        });
        var deferred = q.defer();
        s3.deleteObjects({
            Bucket: bucket,
            Delete: {
                Objects: keys
            }
        }, function (err, data) {
            if (err) {
                return deferred.reject(err);
            }
            deferred.resolve(data);
        });
        return deferred.promise;
    }

    S3fs.prototype.rmFiles = function (keys, cb) {
        var promise = deleteObjects(this.s3, this.bucket, keys);
        if (!cb) {
            return promise;
        }
        promise.then(function (response) {
            cb(undefined, response);
        }, function (reason) {
            cb(reason);
        });
    };

    function deleteObject(s3, bucket, key) {
        var deferred = q.defer();
        s3.deleteObject({
            Bucket: bucket,
            Key: key
        }, function (err, data) {
            if (err) {
                return deferred.reject(err);
            }
            deferred.resolve(data);
        });
        return deferred.promise;
    }

    S3fs.prototype.unlink = function (name, cb) {
        var promise = deleteObject(this.s3, this.bucket, this.path + s3Utils.toKey(name));
        if (!cb) {
            return promise;
        }
        promise.then(function (response) {
            cb(undefined, response);
        }, function (reason) {
            cb(reason);
        });
    };

    //TODO: Convert the rest of the code to using this method for retrieving the head.
    S3fs.prototype.headObject = function (name, cb) {
        var deferred = !cb ? q.defer() : undefined;
        this.s3.headObject({
            Bucket: this.bucket,
            Key: this.path + s3Utils.toKey(name)
        }, function (err, data) {
            if (err) {
                return deferred ? deferred.reject(err) : cb(err);
            }
            return deferred ? deferred.resolve(data) : cb(null, data);
        });
        return deferred ? deferred.promise : undefined;
    };

    S3fs.prototype.exists = function (name, cb) {
        var deferred = !cb ? q.defer() : undefined,
            key = this.path + s3Utils.toKey(name);

        if (directoryRegExp.test(key)) {
            return deferred ? deferred.resolve(true) : cb(true);
        } else {
            this.s3.headObject(
                {
                    Bucket: this.bucket,
                    Key: key
                },
                function (err, data) {
                    if (err) {
                        return deferred ? deferred.reject(err) : cb(false);
                    }
                    return deferred ? deferred.resolve(data) : cb(true);
                });
        }
        return deferred ? deferred.promise : undefined;
    };

    S3fs.prototype.destroy = function (cb) {
        var deferred = !cb ? q.defer() : undefined,
            self = this;
        self.rmdirp().then(function () {
            self.delete().then(function () {
                return deferred ? deferred.resolve() : cb();
            }, function (reason) {
                return deferred ? deferred.reject(reason) : cb(reason);
            });
        }, function (reason) {
            return deferred ? deferred.reject(reason) : cb(reason);
        });
        return deferred ? deferred.promise : undefined;
    };

    S3fs.prototype.copyObject = function (sourcePath, destinationPath, cb) {
        var deferred = !cb ? q.defer() : undefined;
        if (directoryRegExp.test(sourcePath)) {
            // Directories are automatically created, so there's no need to 'copy' a directory.
            process.nextTick(function () {
                return deferred ? deferred.resolve() : cb(null);
            });
        } else {
            this.s3.copyObject({
                Bucket: this.bucket,
                Key: this.path + s3Utils.toKey(destinationPath),
                CopySource: [this.bucket, this.path + s3Utils.toKey(sourcePath)].join('/')
            }, function (err) {
                if (err) {
                    return deferred ? deferred.reject(err + sourcePath) : cb(err + sourcePath);
                }
                return deferred ? deferred.resolve() : cb(null);
            });
        }
        return deferred ? deferred.promise : undefined;
    };

    S3fs.prototype.readdirp = function (name, cb) {
        var prefix =  this.path + s3Utils.toKey(name);
        if(prefix[prefix.length - 1] !== '/'){
            prefix += '/';
        }
        var promise = listAllObjectsFiles(this.s3, this.bucket, prefix);
        if (!cb) {
            return promise;
        }
        promise.then(function (files) {
            cb(null, files);
        }, function (reason) {
            cb(reason);
        });
    };

    S3fs.prototype.copyDirectory = function (sourcePath, destinationPath, cb) {
        var self = this,
            promise = listAllObjectsFiles(this.s3, this.bucket, this.path + s3Utils.toKey(sourcePath) + '/').then(function (files) {
                var deferred = q.defer();
                process.nextTick(function () {
                    var promises = [];
                    files.forEach(function (file) {
                        promises.push(self.copyObject([s3Utils.toKey(sourcePath), file].join('/'), [s3Utils.toKey(destinationPath), file].join('/')));
                    });
                    q.all(promises).then(function () {
                        deferred.resolve();
                    }, function (reason) {
                        deferred.reject(reason);
                    });
                });
                return deferred.promise;
            });

        if (!cb) {
            return promise;
        }

        promise.then(function () {
            cb(null);
        }, function (reason) {
            cb(reason);
        });
    };

    function putBucketLifecycle(s3, bucket, name, prefix, days) {
        var deferred = q.defer(),
            options = {
                Bucket: bucket,
                LifecycleConfiguration: {
                    Rules: [
                        {
                            Prefix: prefix,
                            Status: 'Enabled',
                            Expiration: {
                                Days: days
                            },
                            ID: name
                        }
                    ]
                }
            };

        s3.putBucketLifecycle(options, function (err, data) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(data);
            }
        });

        return deferred.promise;
    }

    S3fs.prototype.putBucketLifecycle = function (name, prefix, days, callback) {
        var promise = putBucketLifecycle(this.s3, this.bucket, name, prefix, days);
        if (!callback) {
            return promise;
        }
        promise.then(function (response) {
            callback(undefined, response);
        }, function (reason) {
            callback(reason);
        });
    };

    module.exports = S3fs;

}(module, require('./fsInterface'), require('util'), require('q'), require('aws-sdk'), require('./utils'), require('extend'), require('./s3WriteStream'),
    require('./Stats')));
