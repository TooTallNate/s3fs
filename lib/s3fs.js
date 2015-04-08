/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Riptide Software Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/* jshint maxparams: 9 */
(function (module, fsInterface, util, q, AWS, s3Utils, extend, S3WriteStream, Stats) {
    /* jshint maxparams: 5 */
    'use strict';
    var directoryRegExp = /\/$/,
        defaultCreateOptions = {};

    function S3fs(options, bucket) {
        if (!(this instanceof S3fs)) {
            return new S3fs(options, bucket);
        }

        if (!options) {
            throw new Error('options is required');
        } else if (!(options instanceof AWS.S3)) {
            if (!options.accessKeyId) {
                throw new Error('accessKeyId is required');
            } else if (!options.secretAccessKey) {
                throw new Error('secretAccessKey is required');
            }
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

    function whiteSpace(item) {
        return item;
    }

    util.inherits(S3fs, fsInterface);

    /*
     Begin FS Methods
     */

    S3fs.prototype.createReadStream = function (name) {
        return this.s3.getObject({
            Bucket: this.bucket,
            Key: this.path + s3Utils.toKey(name)
        }).createReadStream();
    };

    S3fs.prototype.createWriteStream = function (name) {
        return new S3WriteStream(this.s3, this.bucket, this.path + s3Utils.toKey(name));
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

    function mkdir(path, cb) {
        var promise = putObject(this.s3, this.bucket, this.path + s3Utils.toKey(path) + '/');
        if (!cb) {
            return promise;
        }
        promise.then(function (response) {
            cb(undefined, response);
        }, function (reason) {
            cb(reason);
        });
    }

    S3fs.prototype.mkdir = mkdir;

    S3fs.prototype.mkdirp = mkdir;

    S3fs.prototype.stat = function (path, cb) {
        return getFileStats(this, path, cb);
    };

    S3fs.prototype.lstat = function (path, cb) {
        return getFileStats(this, path, cb);
    };

    S3fs.prototype.readdir = function (name, cb) {
        var prefix = this.path + s3Utils.toKey(name);
        if (prefix[prefix.length - 1] !== '/') {
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

    /*
     End FS Methods
     */

    /*
     Begin Custom Methods
     */

    /**
     * Provides a clone of the instance of S3FS which has relative access to the specified directory.
     *
     * @example
     * ```js
     * // Create an instance of S3FS which has a current working directory of `test-folder` within the S3 bucket `test-bucket`
     * var fsImpl = new S3FS(options, 'test-bucket/test-folder');
     * // Creates a copy (which uses the same instance of S3FS) which has a current working directory of `test-folder/styles`
     * var fsImplStyles = fsImpl.clone('styles');
     * ```
     *
     * @param path `String`. _Optional_. The relative path to extend the current working directory
     * @returns {S3fs}
     */
    S3fs.prototype.clone = function (path) {
        return new S3fs(this.s3, s3Utils.joinPaths(this.bucket, s3Utils.joinPaths(this.path, path)));
    };

    /**
     * Allows an object to be copied from one path to another path within the same bucket. Paths are relative to
     * the bucket originally provided.
     *
     * @example
     * ```js
     * var fsImpl = new S3FS(options, 'test-bucket');
     * fsImpl.copyObject('test-folder/test-file.txt', 'other-folder/test-file.txt').then(function() {
     *   // Object was successfully copied
     * }, function(reason) {
     *   // Something went wrong
     * });
     * ```
     *
     * @param sourcePath `String`. **Required**. Relative path to the source file
     * @param destinationPath `String`. **Required**. Relative path to the destination file
     * @param cb `Function`. _Optional_. Callback to be used, if not provided will return a Promise
     * @returns {Promise|*} Returns a `Promise` if a callback is not provided
     */
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

    /**
     * Creates a new bucket on S3.
     *
     * @example
     * ```js
     * var fsImpl = new S3FS(options, 'test-bucket');
     * fsImpl.create().then(function() {
     *   // Bucket was successfully created
     * }, function(reason) {
     *   // Something went wrong
     * });
     * ```
     *
     * @param options `Object`. _Optional_. The options to be used when creating the bucket. See [AWS SDK](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#createBucket-property)
     * @param cb `Function`. _Optional_. Callback to be used, if not provided will return a Promise
     * @returns {Promise|*} Returns a `Promise` if a callback is not provided
     */
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

    /**
     * Deletes a bucket on S3, can only be deleted when empty. If you need to delete one that isn't empty use
     * `[destroy(cb)](#s3fs.destroy(cb))` instead.
     *
     * @example
     * ```js
     * var fsImpl = new S3FS(options, 'test-bucket');
     * fsImpl.delete().then(function() {
     *   // Bucket was successfully deleted
     * }, function(reason) {
     *   // Something went wrong
     * });
     * ```
     *
     * @param cb `Function`. _Optional_. Callback to be used, if not provided will return a Promise
     * @returns {Promise|*} Returns a `Promise` if a callback is not provided
     */
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

    /**
     * Retrieves the details about an object, but not the contents.
     *
     * @example
     * ```js
     * var fsImpl = new S3FS(options, 'test-bucket');
     * fsImpl.headObject('test-file.txt').then(function(details) {
     *   // Details contains details such as the `ETag` about the object. See [AWS SDK](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#headObject-property) for details.
     * }, function(reason) {
     *   // Something went wrong
     * });
     * ```
     *
     * @param path `String`. **Required**. Path to the object to retrieve the head for
     * @param cb `Function`. _Optional_. Callback to be used, if not provided will return a Promise
     * @returns {Promise|*} Returns a `Promise` if a callback is not provided
     */
    S3fs.prototype.headObject = function (path, cb) {
        //TODO: Convert the rest of the code to using this method for retrieving the head.
        var deferred = !cb ? q.defer() : undefined;
        this.s3.headObject({
            Bucket: this.bucket,
            Key: this.path + s3Utils.toKey(path)
        }, function (err, data) {
            if (err) {
                return deferred ? deferred.reject(err) : cb(err);
            }
            return deferred ? deferred.resolve(data) : cb(null, data);
        });
        return deferred ? deferred.promise : undefined;
    };

    /**
     * Retrieves a list of all objects within the specific path. The result is similar to that of [headObject(path, cb](#s3fs.headObject(path, cb))
     * expect that it contains an array of objects.
     *
     * @example
     * ```js
     * var fsImpl = new S3FS(options, 'test-bucket');
     * fsImpl.listContents('/', '/').then(function(data) {
     *   // Data.Contents contains details such as the `ETag` about the object. See [AWS SDK](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#headObject-property) for details.
     * }, function(reason) {
     *   // Something went wrong
     * });
     * ```
     *
     * @param path `String`. **Required**. The path to list all of the objects for
     * @param marker `String`. **Required**. The key to start with when listing objects
     * @param cb `Function`. _Optional_. Callback to be used, if not provided will return a Promise
     * @returns {Promise|*} Returns a `Promise` if a callback is not provided
     */
    S3fs.prototype.listContents = function (path, marker, cb) {
        var callback = cb || (typeof marker === 'function' ? marker : undefined);
        marker = (typeof marker === 'function' ? undefined : marker);
        var promise = listAllObjects(this.s3, this.bucket, this.path + s3Utils.toKey(path) + '/', '/', marker);
        if (!callback) {
            return promise;
        }
        promise.then(function (contents) {
            callback(null, contents);
        }, function (reason) {
            callback(reason);
        });
    };

    /*
     Begin Recursive Custom Methods
     */

    /**
     * Recursively copies a directory from the source path to the destination path.
     *
     * @example
     * ```js
     * var fsImpl = new S3FS(options, 'test-bucket');
     * fsImpl.copyDirectory('test-folder', 'other-folder').then(function() {
     *   // Directory was successfully copied
     * }, function(reason) {
     *   // Something went wrong
     * });
     * ```
     *
     * @param sourcePath `String`. **Required**. The source directory to be copied
     * @param destinationPath `String`. **Required**. The destination directory to be copied to
     * @param cb `Function`. _Optional_. Callback to be used, if not provided will return a Promise
     * @returns {Promise|*} Returns a `Promise` if a callback is not provided
     */
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

    /**
     * Recursively deletes all files within the bucket and then deletes the bucket.
     *
     * @example
     * ```js
     * var fsImpl = new S3FS(options, 'test-bucket');
     * fsImpl.destroy().then(function() {
     *   // Bucket was successfully destroyed
     * }, function(reason) {
     *   // Something went wrong
     * });
     * ```
     *
     * @param cb `Function`. _Optional_. Callback to be used, if not provided will return a Promise
     * @returns {Promise|*} Returns a `Promise` if a callback is not provided
     */
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

    /**
     * Adds/Updates a lifecycle on a bucket.
     *
     * @example
     * ```js
     * var fsImpl = new S3FS(options, 'test-bucket');
     * // Remove the Cached contents in the `/cache` directory each day.
     * fsImpl.putBucketLifecycle('expire cache', 'cache', 1).then(function() {
     *   // Bucket Lifecycle was successfully added/updated
     * }, function(reason) {
     *   // Something went wrong
     * });
     * ```
     *
     * @param name `String`. **Required**. The name of the lifecycle. The value cannot be longer than 255 characters.
     * @param prefix `String`. **Required**. Prefix identifying one or more objects to which the rule applies.
     * @param days Indicates the lifetime, in days, of the objects that are subject to the rule. The value must be a non-zero positive integer.
     * @param cb `Function`. _Optional_. Callback to be used, if not provided will return a Promise
     * @returns {Promise|*} Returns a `Promise` if a callback is not provided
     */
    S3fs.prototype.putBucketLifecycle = function (name, prefix, days, cb) {
        var promise = putBucketLifecycle(this.s3, this.bucket, name, prefix, days);
        if (!cb) {
            return promise;
        }
        promise.then(function (response) {
            cb(undefined, response);
        }, function (reason) {
            cb(reason);
        });
    };

    /**
     * Recursively reads a directory.
     *
     * @example
     * ```js
     * var fsImpl = new S3FS(options, 'test-bucket');
     * fsImpl.readdirp('test-folder').then(function(files) {
     *   // Files contains a list of all of the files similar to [fs.readdir(path, callback)](http://nodejs.org/api/fs.html#fs_fs_readdir_path_callback) but with recursive contents
     * }, function(reason) {
     *   // Something went wrong
     * });
     * ```
     *
     * @param path `String`. **Required**. The path to the directory to read from
     * @param cb `Function`. _Optional_. Callback to be used, if not provided will return a Promise
     * @returns {Promise|*} Returns a `Promise` if a callback is not provided
     */
    S3fs.prototype.readdirp = function (path, cb) {
        var prefix = this.path + s3Utils.toKey(path);
        if (prefix[prefix.length - 1] !== '/') {
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

    /**
     * Recursively deletes a directory.
     *
     * @example
     * ```js
     * var fsImpl = new S3FS(options, 'test-bucket');
     * fsImpl.rmdirp('test-folder').then(function() {
     *   // Directory has been recursively deleted
     * }, function(reason) {
     *   // Something went wrong
     * });
     * ```
     *
     * @param path The path to the directory to delete
     * @param cb `Function`. _Optional_. Callback to be used, if not provided will return a Promise
     * @returns {Promise|*} Returns a `Promise` if a callback is not provided
     */
    S3fs.prototype.rmdirp = function (path, cb) {
        var self = this,
            promise = listAllObjectsFiles(this.s3, this.bucket, path ? this.path + s3Utils.toKey(path) + '/' : undefined).then(function (objects) {
                return q.all(objects.filter(function (object) {
                    //filter items
                    return !directoryRegExp.test(object);
                }).map(function (object) {
                    //remove all the items
                    return self.unlink((path ? s3Utils.toKey(path) + '/' : '') + object);
                }).concat(objects.filter(function (object) {
                    return directoryRegExp.test(object);
                }).map(function (object) {
                    //remove all folders
                    return self.rmdir((path ? s3Utils.toKey(path) + '/' : '') + object);
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

    /*
     End Recursive Custom Methods
     */

    /*
     End Custom Methods
     */

    /*
     Begin Helper Methods
     */

    function getFileStats(s3fs, path, cb) {
        var deferred = !cb ? q.defer() : undefined;

        // S3 doesn't return information on directories and it automatically creates any that don't exist.
        // So we can return semi-static information about the stats of a directory.
        if (directoryRegExp.test(path)) {
            process.nextTick(function () {
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
                        /* jscs: disable requireCamelCaseOrUpperCaseIdentifiers */
                        /* jshint camelcase: false */
                        atim_msec: date,
                        mtim_msec: date,
                        ctim_msec: date,
                        /* jshint camelcase: true */
                        /* jscs: enable requireCamelCaseOrUpperCaseIdentifiers */
                        path: path
                    });
                return deferred ? deferred.resolve(stats) : cb(null, stats);
            });
        } else {
            s3fs.s3.headObject({
                Bucket: s3fs.bucket,
                Key: s3fs.path + s3Utils.toKey(path, s3fs.bucket, s3fs.path)
            }, function (err, data) {
                if (err) {
                    err.message = err.name;
                    return deferred ? deferred.reject(err) : cb(err);
                }
                var stats = new Stats({
                    dev: 0,
                    ino: 0,
                    mode: 0,
                    nlink: 0,
                    uid: 0,
                    gid: 0,
                    rdev: 0,
                    size: Number(data.ContentLength),
                    /* jscs: disable requireCamelCaseOrUpperCaseIdentifiers */
                    /* jshint camelcase: false */
                    atim_msec: data.LastModified,
                    mtim_msec: data.LastModified,
                    ctim_msec: data.LastModified,
                    /* jshint camelcase: true */
                    /* jscs: enable requireCamelCaseOrUpperCaseIdentifiers */
                    path: path
                });
                return deferred ? deferred.resolve(stats) : cb(err, stats);
            });
        }
        return deferred ? deferred.promise : undefined;
    }

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
            var contentsList = data.Contents.map(function (item) {
                if (objectPrefix && item && item.Key && item.Key.indexOf(objectPrefix) === 0) {
                    item.Key = item.Key.replace(objectPrefix, '');
                }

                return item;
            }).filter(function (item) {
                return item && item.Key;
            });

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

    /*
     End Helper Methods
     */

    module.exports = S3fs;

}(module, require('./fsInterface'), require('util'), require('q'), require('aws-sdk'), require('./utils'), require('extend'), require('./s3WriteStream'),
    require('./Stats')));
