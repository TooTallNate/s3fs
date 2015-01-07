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
(function (chai, chaiAsPromised, cbQ, s3fs) {
    'use strict';
    var expect = chai.expect;

    chai.use(chaiAsPromised);
    chai.config.includeStack = true;

    describe('S3FS Buckets', function () {
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
            s3fsImpl = new s3fs(s3Credentials, bucketName);
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

        it('should be able to create a new bucket', function () {
            return expect(s3fsImpl.create()).to.eventually.be.fulfilled;
        });

        it('should be able to create a new bucket with options', function () {
            return expect(s3fsImpl.create({})).to.eventually.be.fulfilled;
        });

        it('should be able to create a new bucket with a callback', function () {
            var cb = cbQ.cb();
            s3fsImpl.create(cb);
            return expect(cb.promise).to.eventually.be.fulfilled;
        });

        it('should be able to create a new bucket with options and a callback', function () {
            var cb = cbQ.cb();
            s3fsImpl.create({}, cb);
            return expect(cb.promise).to.eventually.be.fulfilled;
        });

        it('should be able to delete a bucket', function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.delete();
                    })
            ).to.eventually.be.fulfilled;
        });

        it('should be able to delete a bucket with a callback', function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        var cb = cbQ.cb();
                        s3fsImpl.delete(cb);
                        return cb.promise;
                    })
            ).to.eventually.be.fulfilled;
        });

        it('shouldn\'t be able to delete a bucket with contents', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test', 'test')
                        .then(function () {
                            return s3fsImpl.delete();
                        })
                })).to.eventually.be.rejectedWith(Error, 'The bucket you tried to delete is not empty');
        });

        it('shouldn\'t be able to delete a bucket with contents and a callback', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test', 'test')
                        .then(function () {
                            var cb = cbQ.cb();
                            s3fsImpl.delete(cb);
                            return cb.promise;
                        })
                })).to.eventually.be.rejectedWith(Error, 'The bucket you tried to delete is not empty');
        });

        it('should be able to destroy bucket', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.destroy()
                })).to.eventually.be.fulfilled;
        });

        it('should be able to destroy bucket with a callback', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.destroy(cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it("should be able to list all the files in a bucket", function () {
            return expect(s3fsImpl.create()
                    .then(function() {
                        return s3fsImpl.mkdir('testDir/')
                            .then(function() {
                                return s3fsImpl.writeFile('testDir/test.json', '{}')
                                    .then(function() {
                                        return  s3fsImpl.writeFile('testDir/test/test.json', '{}');
                                    });
                            })
                            .then(function() {
                               return s3fsImpl.mkdir('testDirDos/')
                                   .then(function() {
                                      return s3fsImpl.writeFile('testDirDos/test.json', '{}');
                                   });
                            });
                    })
                    .then(function() {
                        return s3fsImpl.readdir('/');
                    })
            ).to.eventually.satisfy(function(files) {
                    expect(files).to.have.length(2);
                    expect(files[0]).to.equal('testDir/');
                    expect(files[1]).to.equal('testDirDos/');
                    return true;
                });
        });

        it("should be able to list all the files in a bucket with a callback", function () {
            return expect(s3fsImpl.create()
                    .then(function() {
                        return s3fsImpl.mkdir('testDir/')
                            .then(function() {
                                return s3fsImpl.writeFile('testDir/test.json', '{}')
                                    .then(function() {
                                        return  s3fsImpl.writeFile('testDir/test/test.json', '{}');
                                    });
                            })
                            .then(function() {
                               return s3fsImpl.mkdir('testDirDos/')
                                   .then(function() {
                                      return s3fsImpl.writeFile('testDirDos/test.json', '{}');
                                   });
                            });
                    })
                    .then(function() {
                        var cb = cbQ.cb();
                        s3fsImpl.readdir('/', cb);
                        return cb.promise;
                    })
            ).to.eventually.satisfy(function(files) {
                    expect(files).to.have.length(2);
                    expect(files[0]).to.equal('testDir/');
                    expect(files[1]).to.equal('testDirDos/');
                    return true;
                });
        });

    });
}(require('chai'), require("chai-as-promised"), require('cb-q'), require('../')));