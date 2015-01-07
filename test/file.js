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
(function (chai, chaiAsPromised, fs, cbQ, Q, s3fs) {
    'use strict';
    var expect = chai.expect;

    chai.use(chaiAsPromised);
    chai.config.includeStack = true;

    describe('S3FS Files', function () {
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

        it("should be able to write a file from a string", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                })).to.eventually.be.fulfilled;
        });

        it("should be able to write a file from a string with a callback", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', '{ "test": "test" }', cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it("should be able to write a large file", function () {
            var largeFile = fs.readFileSync('./test/mock/large-file.txt');
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', largeFile);
                })).to.eventually.be.fulfilled;
        });

        it("should be able to write a large file with a callback", function () {
            var largeFile = fs.readFileSync('./test/mock/large-file.txt');
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', largeFile, cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it("should be able to tell if a file exists", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        return s3fsImpl.exists('test-file.json');
                    })
            ).to.eventually.be.fulfilled;
        });

        it("should be able to copy an object", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{}');
                    })
                    .then(function () {
                        return s3fsImpl.copyObject('test-file.json', 'test-file-dos.json');
                    })
            ).to.eventually.be.fulfilled;
        });

        it("should be able to copy an object with a callback", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{}');
                    })
                    .then(function () {
                        var cb = cbQ.cb();
                        s3fsImpl.copyObject('test-file.json', 'test-file-dos.json', cb);
                        return cb.promise;
                    })
            ).to.eventually.be.fulfilled;
        });

        it("should be able to get the head of an object", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{}');
                    })
                    .then(function () {
                        return s3fsImpl.headObject('test-file.json');
                    })
            ).to.eventually.be.fulfilled;
        });

        it("should be able to get the head of an object with a callback", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{}');
                    })
                    .then(function () {
                        var cb = cbQ.cb();
                        s3fsImpl.headObject('test-file.json', cb);
                        return cb.promise;
                    })
            ).to.eventually.be.fulfilled;
        });

        it("should be able to delete a file", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        return s3fsImpl.unlink('test-file.json');
                    })
            ).to.eventually.be.fulfilled;
        });

        it("should be able to delete a file with a callback", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        var cb = cbQ.cb();
                        s3fsImpl.unlink('test-file.json', cb);
                        return cb.promise;
                    })
            ).to.eventually.be.fulfilled;
        });

        it("should be able to tell if a file exists with a callback", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        //Cannot use cbQ here since it is not the standard err, data callback signature.
                        var deferred = Q.defer();
                        s3fsImpl.exists('test-file.json', function (exists) {
                            deferred.resolve(exists);
                        });
                        return deferred.promise;
                    })
            ).to.eventually.be.equal(true);
        });

        it("shouldn\'t be able to write a file from an object", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', {"test": "test"});
                })).to.eventually.be.rejectedWith('Expected params.Body to be a string, Buffer, Stream, Blob, or typed array object');
        });

        it("shouldn\'t be able to write a file from an object with a callback", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', {"test": "test"}, cb);
                    return cb.promise;
                })).to.eventually.be.rejectedWith('Expected params.Body to be a string, Buffer, Stream, Blob, or typed array object');
        });

        it("should be able to write a file from a buffer", function () {
            var exampleFile = fs.readFileSync('./test/mock/large-file.txt');

            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', exampleFile);
                })).to.eventually.be.fulfilled;
        });

        it("should be able to write a file from a buffer with a callback", function () {
            var exampleFile = fs.readFileSync('./test/mock/large-file.txt');

            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', exampleFile, cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it("should be able to write a file from a stream", function () {
            var stream = fs.createReadStream('./test/mock/example-file.json');

            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', stream);
                })).to.eventually.be.fulfilled;
        });

        it("should be able to write a file from a stream with a callback", function () {
            var stream = fs.createReadStream('./test/mock/example-file.json');

            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', stream, cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it("should be able to write a large file from a stream", function () {
            var stream = fs.createReadStream('./test/mock/large-file.txt');
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', stream);
                })).to.eventually.be.fulfilled;
        });

        it("should be able to write a large file from a stream with a callback", function () {
            var stream = fs.createReadStream('./test/mock/large-file.txt');
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', stream, cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it("should be able to pipe a file from a stream", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var deferred = Q.defer();
                    fs.createReadStream('./test/mock/example-file.json')
                        .pipe(s3fsImpl.createWriteStream('test-file.json'))
                        .on('finish', function () {
                            deferred.resolve();
                        })
                        .on('error', function (err) {
                            deferred.reject(err);
                        });
                    return deferred.promise;
                })).to.eventually.be.fulfilled;
        });

        it("should be able to pipe a large file from a stream", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var deferred = Q.defer();
                    fs.createReadStream('./test/mock/large-file.txt')
                        .pipe(s3fsImpl.createWriteStream('test-file.txt'))
                        .on('finish', function () {
                            deferred.resolve();
                        })
                        .on('error', function (err) {
                            deferred.reject(err);
                        });
                    return deferred.promise;
                })).to.eventually.be.fulfilled;
        });

        it.skip("should be able to write a file from a blob", function () {
            //TODO: Get this setup
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', {"test": "test"});
                })).to.eventually.be.fulfilled;
        });

        it.skip("should be able to write a file from a blob with a callback", function () {
            //TODO: Get this setup
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', {"test": "test"}, cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it.skip("should be able to write a file from a typed array", function () {
            //TODO: Get this setup
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', {"test": "test"});
                })).to.eventually.be.fulfilled;
        });

        it.skip("should be able to write a file from a typed array with a callback", function () {
            //TODO: Get this setup
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', {"test": "test"}, cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it("should be able to write a file from a string with a callback", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', '{ "test": "test" }', cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it("should be able to read the file as a stream", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        var deferred = Q.defer(),
                            data = '';
                        try {
                            s3fsImpl.createReadStream('test-file.json')
                                .on('data', function (chunk) {
                                    data += chunk;
                                })
                                .on('end', function () {
                                    expect(data).to.be.equal('{ "test": "test" }');
                                    deferred.resolve();
                                })
                                .on('error', function (err) {
                                    deferred.reject(err);
                                });
                        } catch (err) {
                            deferred.reject(err);
                        }
                        return deferred.promise;
                    })
            ).to.eventually.be.fulfilled;
        });

        it("should be able to retrieve the stats of a file - stat(2)", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        return s3fsImpl.stat('test-file.json');
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isFile()).to.be.true;
                    return true;
                });
        });

        it("should be able to retrieve the stats of a file with a callback - stat(2)", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        var cb = cbQ.cb();
                        s3fsImpl.stat('test-file.json', cb);
                        return cb.promise;
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isFile()).to.be.true;
                    return true;
                });
        });

        it("shouldn\'t be able to retrieve the stats of a file that doesn\'t exist - stat(2)", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        return s3fsImpl.stat('test-file-no-exist.json');
                    })
            ).to.eventually.be.rejectedWith(Error, 'NotFound');
        });

        it("shouldn\'t be able to retrieve the stats of a file that doesn\'t exist with a callback - stat(2)", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        var cb = cbQ.cb();
                        s3fsImpl.stat('test-file-no-exist.json', cb);
                        return cb.promise;
                    })
            ).to.eventually.be.rejectedWith(Error, 'NotFound');
        });

        it("should be able to retrieve the stats of a file - lstat(2)", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        return s3fsImpl.lstat('test-file.json');
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isFile()).to.be.true;
                    return true;
                });
        });

        it("should be able to retrieve the stats of a file with a callback - lstat(2)", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        var cb = cbQ.cb();
                        s3fsImpl.lstat('test-file.json', cb);
                        return cb.promise;
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isFile()).to.be.true;
                    return true;
                });
        });

    });
}(require('chai'), require("chai-as-promised"), require('fs'), require('cb-q'), require('q'), require('../')));