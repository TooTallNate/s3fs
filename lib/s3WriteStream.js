(function (module, Writable, util, extend, q) {
    'use strict';

    var defaultOptions = {},
        maxParts = 1000,
        partBufferSize = 5242880;

    function MultiPartManager(client, bucket, key) {
        this.client = client;
        this.bucket = bucket;
        this.key = key;
        this.parts = [];
        this.partNumber = 0;
        this.currentBuffer = new Buffer(0);
    }

    MultiPartManager.prototype.addChunk = function (chunk) {
        this.currentBuffer = Buffer.concat([this.currentBuffer, chunk]);
        if (this.currentBuffer.length >= partBufferSize) {
            var promise = this.addPart(this.currentBuffer);
            this.parts.push(promise);
            this.currentBuffer = new Buffer(0);
        }
    };

    MultiPartManager.prototype.flush = function () {
        if (this.currentBuffer.length) {
            var promise = this.addPart(this.currentBuffer);
            this.parts.push(promise);
            this.currentBuffer = new Buffer(0);
        }
    };

    MultiPartManager.prototype.addPart = function (buffer) {
        var self = this,
            partNumber = ++this.partNumber,
            error;

        if (partNumber > maxParts) {
            error = util.format('Unable to create partNumber:%d. The max partNumber is %d', partNumber, maxParts);
            return this.abort().then(function () {
                return q.reject(error);
            }, function () {
                // TODO: combine reason with this error
                return q.reject(error);
            });
        }

        return this.uploadId().then(function (uploadId) {
            var deferred = q.defer();
            self.client.uploadPart({
                Bucket: self.bucket,
                Key: self.key,
                Body: buffer,
                UploadId: uploadId,
                PartNumber: partNumber
            }, function (err, result) {
                if (err) {
                    return self.abort().then(function () {
                        deferred.reject(err);
                    }, function () {
                        //TODO: combine the multipart upload error with the abort error
                        deferred.reject(err);
                    });
                }
                result.PartNumber = partNumber;
                deferred.resolve(result);
            });
            return deferred.promise;
        });
    };

    MultiPartManager.prototype.abort = function () {
        var self = this;
        return this.uploadId().then(function (uploadId) {
            var deferred = q.defer();
            self.client.abortMultipartUpload({
                Bucket: self.bucket,
                Key: self.key,
                UploadId: uploadId
            }, function (err) {
                return err ? deferred.reject(err) : deferred.resolve();
            });
            return deferred.promise;
        });
    };

    MultiPartManager.prototype.uploadId = function () {
        var self = this;
        /* jscs: disable disallowDanglingUnderscores */
        return this._uploadIdPromise ?
            this._uploadIdPromise :
            this._uploadIdPromise = (function () {
                var deferred = q.defer();
                self.client.createMultipartUpload({
                    Bucket: self.bucket,
                    Key: self.key
                }, function (err, data) {
                    if (err) {
                        return deferred.reject(err);
                    }
                    deferred.resolve(data.UploadId);
                });
                return deferred.promise;
            }());
        /* jscs: enable disallowDanglingUnderscores */
    };

    MultiPartManager.prototype.put = function () {
        var deferred = q.defer(),
            self = this;
        this.client.putObject({
            Bucket: self.bucket,
            Key: self.key,
            Body: self.currentBuffer
        }, function (err, data) {
            if (err) {
                return deferred.reject(err);
            }
            deferred.resolve(data);
        });
        return deferred.promise;
    };

    MultiPartManager.prototype.complete = function () {
        var self = this;
        return this.partNumber ? this.uploadId().then(function (uploadId) {
            self.flush();
            return q.all(self.parts).then(function (parts) {
                var deferred = q.defer();
                self.client.completeMultipartUpload({
                    Bucket: self.bucket,
                    Key: self.key,
                    UploadId: uploadId,
                    MultipartUpload: {
                        Parts: parts
                    }
                }, function (err, data) {
                    if (err) {
                        return deferred.reject(err);
                    }
                    deferred.resolve(data);
                });
                return deferred.promise;
            });
        }) :
            //if we did not reach the part limit of 5M just use putObject
            this.put();

    };

    function S3WriteStream(client, bucket, key, options) {
        if (!this instanceof S3WriteStream) {
            return new S3WriteStream(client, bucket, key, options);
        }
        this.multiPartManager = new MultiPartManager(client, bucket, key);
        var streamOptions = extend(defaultOptions, options);
        //initialize
        Writable.call(this, streamOptions);
    }

    util.inherits(S3WriteStream, Writable);

    function execCb(cb) {
        if (cb && typeof cb === 'function') {
            cb();
        }
    }

    S3WriteStream.prototype.write = function (chunk, enc, cb) {
        this.multiPartManager.addChunk(chunk);
        execCb(cb);
    };

    S3WriteStream.prototype.end = function (chunk, encoding, cb) {
        var self = this;
        if (chunk) {
            this.multiPartManager.addChunk(chunk);
        }
        this.multiPartManager.complete().then(function () {
            self.emit('finish');
            execCb(cb);
        }, function (reason) {
            self.emit('error', reason);
            execCb(cb);
        });

    };

    module.exports = S3WriteStream;
}(module, require('stream').Writable, require('util'), require('extend'), require('q')));
