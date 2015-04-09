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
(function (chai, chaiAsPromised, fs, Promise, S3FS) {
    'use strict';
    var expect = chai.expect;

    chai.use(chaiAsPromised);
    chai.config.includeStack = true;

    describe('S3FS Files', function () {
        var s3Credentials,
            bucketName,
            bucketS3fsImpl,
            s3fsImpl;

        before(function () {
            if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_KEY) {
                throw new Error('Both an AWS Access Key ID and Secret Key are required');
            }
            s3Credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_KEY,
                region: process.env.AWS_REGION
            };
            bucketName = 's3fs-file-test-bucket-' + (Math.random() + '').slice(2, 8);
            s3fsImpl = new S3FS(bucketName, s3Credentials);

            return s3fsImpl.create();
        });

        beforeEach(function () {
            bucketS3fsImpl = s3fsImpl.clone('testDir-' + (Math.random() + '').slice(2, 8));
        });

        after(function (done) {
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

        it('should be able to write a file from a string', function () {
            return expect(bucketS3fsImpl.writeFile('test-file.json', '{ "test": "test" }')).to.eventually.be.fulfilled();
        });

        it('should be able to write a file from a string with a callback', function () {
            return expect(new Promise(function (resolve, reject) {
                bucketS3fsImpl.writeFile('test.json', '{ "test": "test" }', function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            })).to.eventually.be.fulfilled();
        });

        it('should be able to write a large file', function () {
            var largeFile = fs.readFileSync('./test/mock/large-file.txt');
            return expect(bucketS3fsImpl.writeFile('write-large.txt', largeFile)).to.eventually.be.fulfilled();
        });

        it('should be able to write a file with encoding', function () {
            var fileText = '{ "test": "test" }';
            var options = {encoding: 'utf16'};
            return bucketS3fsImpl.writeFile('test-file.json', fileText, {encoding: 'utf16'}).then(function () {
                return expect(bucketS3fsImpl.readFile('test-file.json', options)).to.eventually.satisfy(function (data) {
                    expect(data.Body.toString()).to.equal(fileText);
                    return true;
                });
            });
        });

        it('should be able to write a large file with a callback', function () {
            var largeFile = fs.readFileSync('./test/mock/large-file.txt');
            return expect(new Promise(function (resolve, reject) {
                bucketS3fsImpl.writeFile('write-large-callback.txt', largeFile, function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            })).to.eventually.be.fulfilled();
        });

        it('should be able to tell if a file exists', function () {
            return expect(bucketS3fsImpl.writeFile('test-exists.json', '{ "test": "test" }')
                    .then(function () {
                        return bucketS3fsImpl.exists('test-exists.json');
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to tell if a file exists with a callback', function () {
            return expect(bucketS3fsImpl.writeFile('test-exists-callback.json', '{ "test": "test" }')
                    .then(function () {
                        return new Promise(function (resolve) {
                            bucketS3fsImpl.exists('test-exists-callback.json', function (exists) {
                                resolve(exists);
                            });
                        });
                    })
            ).to.eventually.be.equal(true);
        });

        it('should be able to copy an object', function () {
            return expect(bucketS3fsImpl.writeFile('test-copy.json', '{}')
                    .then(function () {
                        return bucketS3fsImpl.copyFile('test-copy.json', 'test-copy-dos.json');
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to copy an object with a callback', function () {
            return expect(bucketS3fsImpl.writeFile('test-copy-callback.json', '{}')
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            bucketS3fsImpl.copyFile('test-copy-callback.json', 'test-copy-callback-dos.json', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to get the head of an object', function () {
            return expect(bucketS3fsImpl.writeFile('test-head.json', '{}')
                    .then(function () {
                        return bucketS3fsImpl.headObject('test-head.json');
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to get the head of an object with a callback', function () {
            return expect(bucketS3fsImpl.writeFile('test-head-callback.json', '{}')
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            bucketS3fsImpl.headObject('test-head-callback.json', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to delete a file', function () {
            return expect(bucketS3fsImpl.writeFile('test-delete.json', '{ "test": "test" }')
                    .then(function () {
                        return bucketS3fsImpl.unlink('test-delete.json');
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to delete a file with a callback', function () {
            return expect(bucketS3fsImpl.writeFile('test-delete-callback.json', '{ "test": "test" }')
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            bucketS3fsImpl.unlink('test-delete-callback.json', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.be.fulfilled();
        });

        it('shouldn\'t be able to write a file from an object', function () {
            return expect(bucketS3fsImpl.writeFile('test-write-object.json', {test: 'test'})).to.eventually.be.rejectedWith('Expected params.Body to be a string, Buffer, Stream, Blob, or typed array object');
        });

        it('shouldn\'t be able to write a file from an object with a callback', function () {
            return expect(new Promise(function (resolve, reject) {
                bucketS3fsImpl.writeFile('test-write-object.json', {test: 'test'}, function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            })).to.eventually.be.rejectedWith('Expected params.Body to be a string, Buffer, Stream, Blob, or typed array object');
        });

        it('should be able to write a file from a buffer', function () {
            var exampleFile = fs.readFileSync('./test/mock/example-file.json');
            return expect(bucketS3fsImpl.writeFile('test-buffer.json', exampleFile)).to.eventually.be.fulfilled();
        });

        it('should be able to write a file from a buffer with a callback', function () {
            var exampleFile = fs.readFileSync('./test/mock/example-file.json');
            return expect(new Promise(function (resolve, reject) {
                bucketS3fsImpl.writeFile('test-buffer-callback.json', exampleFile, function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            })).to.eventually.be.fulfilled();
        });

        it('should be able to write a file from a stream', function () {
            var stream = fs.createReadStream('./test/mock/example-file.json');
            return expect(bucketS3fsImpl.writeFile('test-stream.json', stream)).to.eventually.be.fulfilled();
        });

        it('should be able to write a file from a stream with a callback', function () {
            var stream = fs.createReadStream('./test/mock/example-file.json');
            return expect(new Promise(function (resolve, reject) {
                bucketS3fsImpl.writeFile('test-stream-callback.json', stream, function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            })).to.eventually.be.fulfilled();
        });

        it('should be able to write a large file from a stream', function () {
            var stream = fs.createReadStream('./test/mock/large-file.txt');
            return expect(bucketS3fsImpl.writeFile('test-large-stream.txt', stream)).to.eventually.be.fulfilled();
        });

        it('should be able to write a large file from a stream with a callback', function () {
            var stream = fs.createReadStream('./test/mock/large-file.txt');
            return expect(new Promise(function (resolve, reject) {
                bucketS3fsImpl.writeFile('test-large-stream-callback.txt', stream, function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            })).to.eventually.be.fulfilled();
        });

        it('should be able to pipe a file from a stream', function () {
            return expect(new Promise(function (resolve, reject) {
                fs.createReadStream('./test/mock/example-file.json')
                    .pipe(bucketS3fsImpl.createWriteStream('test-pipe.json'))
                    .on('finish', function () {
                        resolve();
                    })
                    .on('error', function (err) {
                        reject(err);
                    });
            })).to.eventually.be.fulfilled();
        });

        it('should be able to pipe a large file from a stream', function () {
            return expect(new Promise(function (resolve, reject) {
                fs.createReadStream('./test/mock/large-file.txt')
                    .pipe(bucketS3fsImpl.createWriteStream('test-pipe-callback.txt'))
                    .on('finish', function () {
                        resolve();
                    })
                    .on('error', function (err) {
                        reject(err);
                    });
            })).to.eventually.be.fulfilled();
        });

        it.skip('should be able to write a file from a blob', function () {
            //TODO: Get this setup
            return expect(bucketS3fsImpl.writeFile('test-blobl.json', {test: 'test'})).to.eventually.be.fulfilled();
        });

        it.skip('should be able to write a file from a blob with a callback', function () {
            //TODO: Get this setup
            return expect(new Promise(function (resolve, reject) {
                bucketS3fsImpl.writeFile('test-blob-callback.json', {test: 'test'}, function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            })).to.eventually.be.fulfilled();
        });

        it.skip('should be able to write a file from a typed array', function () {
            //TODO: Get this setup
            return expect(bucketS3fsImpl.writeFile('test-typed.json', {test: 'test'})).to.eventually.be.fulfilled();
        });

        it.skip('should be able to write a file from a typed array with a callback', function () {
            //TODO: Get this setup
            return expect(new Promise(function (resolve, reject) {
                bucketS3fsImpl.writeFile('test-blob-callback.json', {test: 'test'}, function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            })).to.eventually.be.fulfilled();
        });

        it('should be able to read the file as a stream', function () {
            return expect(bucketS3fsImpl.writeFile('test-read-stream.json', '{ "test": "test" }')
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            var data = '';
                            bucketS3fsImpl.createReadStream('test-read-stream.json')
                                .on('data', function (chunk) {
                                    data += chunk;
                                })
                                .on('end', function () {
                                    expect(data).to.be.equal('{ "test": "test" }');
                                    resolve();
                                })
                                .on('error', function (err) {
                                    reject(err);
                                });
                        });
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to retrieve the stats of a file - stat(2)', function () {
            return expect(bucketS3fsImpl.writeFile('test-stat.json', '{ "test": "test" }')
                    .then(function () {
                        return bucketS3fsImpl.stat('test-stat.json');
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isFile()).to.be.true();
                    return true;
                });
        });

        it('should be able to retrieve the stats of a file with a callback - stat(2)', function () {
            return expect(bucketS3fsImpl.writeFile('test-stat-callback.json', '{ "test": "test" }')
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            bucketS3fsImpl.stat('test-stat-callback.json', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isFile()).to.be.true();
                    return true;
                });
        });

        it('shouldn\'t be able to retrieve the stats of a file that doesn\'t exist - stat(2)', function () {
            return expect(bucketS3fsImpl.stat('test-file-no-exist.json')).to.eventually.be.rejectedWith(Error, 'NotFound');
        });

        it('shouldn\'t be able to retrieve the stats of a file that doesn\'t exist with a callback - stat(2)', function () {
            return expect(new Promise(function (resolve, reject) {
                bucketS3fsImpl.stat('test-file-no-exist.json', function (err, data) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            })).to.eventually.be.rejectedWith(Error, 'NotFound');
        });

        it('should be able to retrieve the stats of a file - lstat(2)', function () {
            return expect(bucketS3fsImpl.writeFile('test-lstat.json', '{ "test": "test" }')
                    .then(function () {
                        return bucketS3fsImpl.lstat('test-lstat.json');
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isFile()).to.be.true();
                    return true;
                });
        });

        it('should be able to retrieve the stats of a file with a callback - lstat(2)', function () {
            return expect(bucketS3fsImpl.writeFile('test-lstat-callback.json', '{ "test": "test" }')
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            bucketS3fsImpl.lstat('test-lstat-callback.json', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isFile()).to.be.true();
                    return true;
                });
        });

    });
}(require('chai'), require('chai-as-promised'), require('fs'), require('bluebird'), require('../')));