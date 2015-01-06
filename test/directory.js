(function (chai, chaiAsPromised, cbQ, s3fs) {
    'use strict';
    var expect = chai.expect;

    chai.use(chaiAsPromised);
    chai.config.includeStack = true;

    describe('S3FS Directories', function () {
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

        it("should be able to create a directory", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.mkdir('test-dir');
                })).to.eventually.be.fulfilled;
        });

        it("should be able to create a directory with a callback", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.mkdir('test-dir', cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it('should be able to tell that a directory exists', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.exists('/');
                })).to.eventually.be.fulfilled;
        });

        it('should be able to tell that a directory exists with a callback', function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.exists('/', function (exists) {
                        cb(null, exists);
                    });
                    return cb.promise;
                })).to.eventually.be.equal(true);
        });

        it.skip('should be able to tell that a sub-directory exists', function () {
            //TODO: Fix this so that it actually works on sub-directories.
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.mkdir('test-dir')
                        .then(function () {
                            return s3fsImpl.exists('test-dir/');
                        });
                })).to.eventually.be.equal(true);
        });

        it.skip('should be able to tell that a sub-directory exists with a callback', function () {
            //TODO: Fix this so that it actually works on sub-directories.
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.mkdir('test-dir')
                        .then(function () {
                            var cb = cbQ.cb();
                            s3fsImpl.exists('test-dir/', cb);
                            return cb.promise;
                        });
                })).to.eventually.be.equal(true);
        });

        it("should be able to copy a directory recursively", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('testCopyDirPromise/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testCopyDirPromise/test/test.json', '{}');
                            });
                    })
                    .then(function () {
                        return s3fsImpl.copyDirectory('testCopyDirPromise', 'testCopyDirDestPromise');
                    })
                    .then(function () {
                        return s3fsImpl.readdir('testCopyDirDestPromise');
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.length(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/');
                    return true;
                });
        });

        it("should be able to copy a directory recursively with a promise", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('testCopyDirCb/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testCopyDirCb/test/test.json', '{}');
                            });
                    })
                    .then(function () {
                        return s3fsImpl.copyDirectory('testCopyDirCb', 'testCopyDirDestCb');
                    })
                    .then(function () {
                        var cb = cbQ.cb();
                        s3fsImpl.readdir('testCopyDirDestCb', cb);
                        return cb.promise;
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.length(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/');
                    return true;
                });
        });

        it("should be able to delete a directory recursively", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('testDeleteDirPromise/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testDeleteDirPromise/test/test.json', '{}')
                                    .then(function () {
                                        return s3fsImpl.writeFile('testDeleteDirPromise/test/test/test.json', '{}');
                                    })
                            })
                            .then(function () {
                                return s3fsImpl.rmdirp('testDeleteDirPromise/test')
                                    .then(function () {
                                        return s3fsImpl.readdir('testDeleteDirPromise');
                                    })
                            })
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.length(1);
                    expect(files[0]).to.equal('test.json');
                    return true;
                });
        });

        it("should be able to delete a directory recursively with a callback", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('testDeleteDirCb/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testDeleteDirCb/test/test.json', '{}')
                                    .then(function () {
                                        return s3fsImpl.writeFile('testDeleteDirCb/test/test/test.json', '{}');
                                    })
                            })
                            .then(function () {
                                return s3fsImpl.rmdirp('testDeleteDirCb/test')
                                    .then(function () {
                                        var cb = cbQ.cb();
                                        s3fsImpl.readdir('testDeleteDirCb', cb);
                                        return cb.promise;
                                    })
                            })
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.length(1);
                    expect(files[0]).to.equal('test.json');
                    return true;
                });
        });

        it("should list all the files in a directory recursively", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('testCopyDirPromise/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testCopyDirPromise/test/test.json', '{}');
                            })
                            .then(function () {
                                return s3fsImpl.rmdirp('testDeleteDirCb/test')
                                    .then(function () {
                                        return s3fsImpl.readdirp('testCopyDirPromise');
                                    })
                            })
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.length(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/test.json');
                    return true;
                });
        });

        it("should list all the files in a directory recursively with a callback", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('testCopyDirPromise/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testCopyDirPromise/test/test.json', '{}');
                            })
                            .then(function () {
                                return s3fsImpl.rmdirp('testDeleteDirCb/test')
                                    .then(function () {
                                        var cb = cbQ.cb();
                                        s3fsImpl.readdirp('testCopyDirPromise', cb);
                                        return cb.promise;
                                    })
                            })
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.length(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/test.json');
                    return true;
                });
        });

    });
}(require('chai'), require("chai-as-promised"), require('cb-q'), require('../')));