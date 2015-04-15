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
(function (chai, chaiAsPromised, Promise, S3FS) {
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
            bucketName = 's3fs-bucket-test-bucket-' + (Math.random() + '').slice(2, 8);
            s3fsImpl = new S3FS(bucketName, s3Credentials);
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
            return expect(s3fsImpl.create()).to.eventually.be.fulfilled();
        });

        it('shouldn\'t received an error when creating a duplicate bucket owned by the same account', function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.create();
                    })
            ).to.eventually.be.fulfilled();
        });

        it.skip('shouldn\'t be able to create a bucket with an invalid name', function () {
            // See: http://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html
            //TODO: Even though this is an invalid bucketname the AWS SDK still lets you create it.
            var bucketMaxLength = 64;
            s3fsImpl = new S3FS(new Array(bucketMaxLength).join('asdf'), s3Credentials);
            return expect(s3fsImpl.create()).to.eventually.be.rejectedWith('asdf');
        });

        it('should be able to create a new bucket with options', function () {
            return expect(s3fsImpl.create({})).to.eventually.be.fulfilled();
        });

        it('should be able to create a new bucket with a callback', function () {
            return expect(new Promise(function (resolve, reject) {
                s3fsImpl.create(function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            })).to.eventually.be.fulfilled();
        });

        it('should be able to create a new bucket with options and a callback', function () {
            return expect(new Promise(function (resolve, reject) {
                s3fsImpl.create({}, function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            })).to.eventually.be.fulfilled();
        });

        it('should be able to delete a bucket', function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.delete();
                    })
            ).to.eventually.be.fulfilled();
        });

        it('should be able to delete a bucket with a callback', function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            s3fsImpl.delete(function (err) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve();
                            });
                        });
                    })
            ).to.eventually.be.fulfilled();
        });

        it('shouldn\'t be able to delete a bucket with contents', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test', 'test')
                        .then(function () {
                            return s3fsImpl.delete();
                        });
                })).to.eventually.be.rejectedWith(Error, 'The bucket you tried to delete is not empty');
        });

        it('shouldn\'t be able to delete a bucket with contents and a callback', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test', 'test')
                        .then(function () {
                            return new Promise(function (resolve, reject) {
                                s3fsImpl.delete(function (err) {
                                    if (err) {
                                        return reject(err);
                                    }
                                    resolve();
                                });
                            });
                        });
                })).to.eventually.be.rejectedWith(Error, 'The bucket you tried to delete is not empty');
        });

        it('should be able to destroy bucket', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.destroy();
                })).to.eventually.be.fulfilled();
        });

        it('should be able to destroy bucket with contents in it', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test.json', 'test');
                })
                .then(function () {
                    return s3fsImpl.writeFile('some/folder.json', 'test');
                })
                .then(function () {
                    return s3fsImpl.writeFile('some/highly/nested/object/in/folder/which/is/highly/nested.json', 'test');
                })
                .then(function () {
                    return s3fsImpl.destroy();
                })).to.eventually.be.fulfilled();
        });

        it('should be able to destroy bucket with contents in it from a sub-folder', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    s3fsImpl = s3fsImpl.clone('sub/folder');
                    return s3fsImpl.writeFile('test.json', 'test');
                })
                .then(function () {
                    return s3fsImpl.writeFile('some/folder.json', 'test');
                })
                .then(function () {
                    return s3fsImpl.writeFile('some/highly/nested/object/in/folder/which/is/highly/nested.json', 'test');
                })
                .then(function () {
                    return s3fsImpl.destroy();
                })).to.eventually.be.fulfilled();
        });

        it('should be able to destroy bucket with a callback', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return new Promise(function (resolve, reject) {
                        s3fsImpl.destroy(function (err) {
                            if (err) {
                                return reject(err);
                            }
                            resolve();
                        });
                    });
                })).to.eventually.be.fulfilled();
        });

        it('should be able to list all the files in a bucket', function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.mkdir('testDir/')
                            .then(function () {
                                return s3fsImpl.writeFile('testDir/test.json', '{}')
                                    .then(function () {
                                        return s3fsImpl.writeFile('testDir/test/test.json', '{}');
                                    });
                            })
                            .then(function () {
                                return s3fsImpl.mkdir('testDirDos/')
                                    .then(function () {
                                        return s3fsImpl.writeFile('testDirDos/test.json', '{}');
                                    });
                            });
                    })
                    .then(function () {
                        return s3fsImpl.readdir('/');
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(2);
                    expect(files[0]).to.equal('testDir/');
                    expect(files[1]).to.equal('testDirDos/');
                    return true;
                });
        });

        it('should be able to list all the files in a bucket with a callback', function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.mkdir('testDir/')
                            .then(function () {
                                return s3fsImpl.writeFile('testDir/test.json', '{}')
                                    .then(function () {
                                        return s3fsImpl.writeFile('testDir/test/test.json', '{}');
                                    });
                            })
                            .then(function () {
                                return s3fsImpl.mkdir('testDirDos/')
                                    .then(function () {
                                        return s3fsImpl.writeFile('testDirDos/test.json', '{}');
                                    });
                            });
                    })
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            s3fsImpl.readdir('/', function (err, data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(data);
                            });
                        });
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.lengthOf(2);
                    expect(files[0]).to.equal('testDir/');
                    expect(files[1]).to.equal('testDirDos/');
                    return true;
                });
        });

    });
}(require('chai'), require('chai-as-promised'), require('bluebird'), require('../')));