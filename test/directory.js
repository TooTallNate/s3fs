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
(function (chai, chaiAsPromised, dirtyChai, Promise, S3FS) {
    'use strict';
    var expect = chai.expect;

    chai.use(chaiAsPromised);
    chai.use(dirtyChai);
    chai.config.includeStack = true;

    describe('S3FS Directories', function () {
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
            bucketName = 's3fs-directory-test-bucket-' + (Math.random() + '').slice(2, 8);
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

        it('should be able to create a directory', function () {
            return expect(bucketS3fsImpl.mkdir('testDir')).to.eventually.be.fulfilled();
        });

        it('should be able to create a directory with a callback', function () {
            return expect(new Promise(function (resolve, reject) {
                s3fsImpl.mkdir('testDir', function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            })).to.eventually.be.fulfilled();
        });

        it('should be able to recursively create directories', function () {
            return expect(bucketS3fsImpl.mkdirp('testDir/testSubDir/anotherDir')).to.eventually.be.fulfilled();
        });

        it('should be able to recursively create directories with a callback', function () {
            return expect(new Promise(function (resolve, reject) {
                s3fsImpl.mkdirp('testDirDos/testSubDir/anotherDir', function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            })).to.eventually.be.fulfilled();
        });

        it('should be able to tell that a directory exists', function () {
            return expect(bucketS3fsImpl.exists('/')).to.eventually.be.fulfilled();
        });

        it('should be able to tell that a directory exists with a callback', function () {
            return expect(new Promise(function (resolve) {
                s3fsImpl.exists('/', function (exists) {
                    resolve(exists);
                });
            })).to.eventually.be.equal(true);
        });

        it.skip('should be able to tell that a sub-directory exists', function () {
            //TODO: Fix this so that it actually works on sub-directories.
            return expect(bucketS3fsImpl.mkdir('testDir')
                    .then(function () {
                        return bucketS3fsImpl.exists('testDir/');
                    })
            ).to.eventually.be.equal(true);
        });

        it.skip('should be able to tell that a sub-directory exists with a callback', function () {
            //TODO: Fix this so that it actually works on sub-directories.
            return expect(bucketS3fsImpl.mkdir('testDir')
                .then(function () {
                    return new Promise(function (resolve) {
                        s3fsImpl.exists('testDir/', function (exists) {
                            resolve(exists);
                        });
                    });
                })).to.eventually.be.equal(true);
        });

        it('should be able to remove an empty directory', function () {
            return expect(bucketS3fsImpl.mkdir('testDir')
                    .then(function () {
                        return bucketS3fsImpl.rmdir('testDir');
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to remove an empty directory with a callback', function () {
            return expect(bucketS3fsImpl.mkdir('testDir')
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            s3fsImpl.rmdir('testDir', function (err) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve();
                            });
                        });
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to remove a non-empty directory', function () {
            return expect(bucketS3fsImpl.mkdir('testDir')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test.json', '{}');
                    })
                    .then(function () {
                        return bucketS3fsImpl.rmdir('testDir');
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to remove a non-empty directory with a callback', function () {
            return expect(bucketS3fsImpl.mkdir('testDir')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test.json', '{}');
                    })
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            s3fsImpl.rmdir('testDir', function (err) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve();
                            });
                        });
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to copy a directory recursively', function () {
            return expect(bucketS3fsImpl.writeFile('testDir/test.json', '{}')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test/test.json', '{}');
                    })
                    .then(function () {
                        return bucketS3fsImpl.copyDir('testDir', 'testCopyDirDestPromise');
                    })
                    .then(function () {
                        return bucketS3fsImpl.readdir('testCopyDirDestPromise');
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/');
                    return true;
                });
        });

        it('should be able to copy a directory recursively with a promise', function () {
            return expect(bucketS3fsImpl.writeFile('testDir/test.json', '{}')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test/test.json', '{}');
                    })
                    .then(function () {
                        return bucketS3fsImpl.copyDir('testDir', 'testCopyDirDestCb');
                    })
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            bucketS3fsImpl.readdir('testCopyDirDestCb', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/');
                    return true;
                });
        });

        it('should be able to delete a directory recursively', function () {
            return expect(bucketS3fsImpl.writeFile('testDir/test1.json', '{}')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test1/test2.json', '{}')
                            .then(function () {
                                return bucketS3fsImpl.writeFile('testDir/test1/test2/test3.json', '{}');
                            });
                    })
                    .then(function () {
                        return bucketS3fsImpl.rmdirp('testDir/test1')
                            .then(function () {
                                return bucketS3fsImpl.readdir('testDir');
                            });
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(1);
                    expect(files[0]).to.equal('test1.json');
                    return true;
                });
        });

        it('should be able to delete a directory recursively with a callback', function () {
            return expect(bucketS3fsImpl.writeFile('testDir/test.json', '{}')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test/test.json', '{}')
                            .then(function () {
                                return bucketS3fsImpl.writeFile('testDir/test/test/test.json', '{}');
                            });
                    })
                    .then(function () {
                        return bucketS3fsImpl.rmdirp('testDir/test')
                            .then(function () {
                                return new Promise(function (resolve, reject) {
                                    bucketS3fsImpl.readdir('testDir', function (err, data) {
                                        if (err) {
                                            return reject(err);
                                        }
                                        resolve(data);
                                    });
                                });
                            });
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(1);
                    expect(files[0]).to.equal('test.json');
                    return true;
                });
        });

        it('should list all the files in a directory recursively', function () {
            return expect(bucketS3fsImpl.writeFile('testDir/test.json', '{}')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test/test.json', '{}');
                    })
                    .then(function () {
                        return bucketS3fsImpl.readdirp('testDir');
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/test.json');
                    return true;
                });
        });

        it('should list all the files in a directory recursively with a callback', function () {
            return expect(bucketS3fsImpl.writeFile('testDir/test.json', '{}')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test/test.json', '{}');
                    })
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            bucketS3fsImpl.readdirp('testDir', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/test.json');
                    return true;
                });
        });

        it('should retrieve the stats of a directory - stat(2)', function () {
            return expect(bucketS3fsImpl.mkdir('testDir/')
                    .then(function () {
                        return bucketS3fsImpl.stat('testDir/');
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isDirectory()).to.be.true();
                    return true;
                });
        });

        it('should retrieve the stats of a directory with a callback - stat(2)', function () {
            return expect(bucketS3fsImpl.mkdir('testDir/')
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            s3fsImpl.stat('testDir/', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isDirectory()).to.be.true();
                    return true;
                });
        });

        it('should retrieve the stats of a directory - lstat(2)', function () {
            return expect(bucketS3fsImpl.mkdir('testDir/')
                    .then(function () {
                        return bucketS3fsImpl.lstat('testDir/');
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isDirectory()).to.be.true();
                    return true;
                });
        });

        it('should retrieve the stats of a directory with a callback - lstat(2)', function () {
            return expect(bucketS3fsImpl.mkdir('testDir/')
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            bucketS3fsImpl.lstat('testDir/', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isDirectory()).to.be.true();
                    return true;
                });
        });

        it('should list all the files in a directory', function () {
            return expect(bucketS3fsImpl.mkdir('testDir/')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test.json', '{}')
                            .then(function () {
                                return bucketS3fsImpl.writeFile('testDir/test/test.json', '{}');
                            });
                    })
                    .then(function () {
                        return bucketS3fsImpl.readdir('testDir/');
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/');
                    return true;
                });
        });

        it('should list all the files in a directory with a callback', function () {
            return expect(bucketS3fsImpl.mkdir('testDir/')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test.json', '{}')
                            .then(function () {
                                return bucketS3fsImpl.writeFile('testDir/test/test.json', '{}');
                            });
                    })
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            bucketS3fsImpl.readdir('testDir/', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/');
                    return true;
                });
        });

        it('should be able to list all objects in a directory', function () {
            return expect(bucketS3fsImpl.mkdir('testDir/')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test.json', '{}')
                            .then(function () {
                                return bucketS3fsImpl.writeFile('testDir/test/test.json', '{}');
                            });
                    })
                    .then(function () {
                        return bucketS3fsImpl.listContents('testDir/');
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(1);
                    expect(files[0].Key).to.be.equal('test.json');
                    return true;
                });
        });

        it('should be able to list all objects in a directory with a callback', function () {
            return expect(bucketS3fsImpl.mkdir('testDir/')
                    .then(function () {
                        return bucketS3fsImpl.writeFile('testDir/test.json', '{}')
                            .then(function () {
                                return bucketS3fsImpl.writeFile('testDir/test/test.json', '{}');
                            });
                    })
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            bucketS3fsImpl.listContents('testDir/', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(1);
                    expect(files[0].Key).to.be.equal('test.json');
                    return true;
                });
        });

    });
}(require('chai'), require('chai-as-promised'), require('dirty-chai'), require('bluebird'), require('../')));
