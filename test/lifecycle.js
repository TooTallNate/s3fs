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
(function (chai, chaiAsPromised, cbQ, S3FS) {
    'use strict';
    var expect = chai.expect;

    chai.use(chaiAsPromised);
    chai.config.includeStack = true;

    describe('S3FS Bucket Lifecycles', function () {
        var s3Credentials,
            bucketName,
            s3fsImpl;

        before(function () {
            if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_KEY) {
                throw new Error('Both an AWS Access Key ID and Secret Key are required');
            }
        });

        beforeEach(function () {
            s3Credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_KEY,
                region: process.env.AWS_REGION
            };
            bucketName = 's3fs-test-bucket-' + (Math.random() + '').slice(2, 8);
            s3fsImpl = new S3FS(s3Credentials, bucketName);
        });

        afterEach(function (done) {
            s3fsImpl.destroy().then(function () {
                done();
            }, function (reason) {
                if (reason.code === 'NoSuchBucket') {
                    // If the bucket doesn't exist during cleanup we don't need to consider it an issue
                    done();
                } else {
                    done(reason);
                }
            });
        });

        it('should be able to set a bucket lifecycle', function () {
            var prefix = 'test',
                days = 1;

            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.putBucketLifecycle('test-expiration-lifecycle', prefix, days);
                })).to.eventually.be.fulfilled;
        });

        it('should be able to set a bucket lifecycle with a callback', function () {
            var prefix = 'test',
                days = 1;

            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.putBucketLifecycle('test-expiration-lifecycle', prefix, days, cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it('should be able to update a bucket lifecycle', function () {
            var prefix = 'test',
                initialDays = 1,
                finalDays = 2;

            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.putBucketLifecycle('test-expiration-lifecycle', prefix, initialDays)
                        .then(function () {
                            return s3fsImpl.putBucketLifecycle('test-expiration-lifecycle', prefix, finalDays);
                        });
                })).to.eventually.be.fulfilled;
        });

        it('should be able to update a bucket lifecycle with a callback', function () {
            var prefix = 'test',
                initialDays = 1,
                finalDays = 2;

            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.putBucketLifecycle('test-expiration-lifecycle', prefix, initialDays)
                        .then(function () {
                            var cb = cbQ.cb();
                            s3fsImpl.putBucketLifecycle('test-expiration-lifecycle', prefix, finalDays, cb);
                            return cb.promise;
                        });
                })).to.eventually.be.fulfilled;
        });

    });
}(require('chai'), require('chai-as-promised'), require('cb-q'), require('../')));