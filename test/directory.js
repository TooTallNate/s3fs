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
                    return s3fsImpl.mkdir('testDir');
                })).to.eventually.be.fulfilled;
        });

        it("should be able to create a directory with a callback", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.mkdir('testDir', cb);
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
                    return s3fsImpl.mkdir('testDir')
                        .then(function () {
                            return s3fsImpl.exists('testDir/');
                        });
                })).to.eventually.be.equal(true);
        });

        it.skip('should be able to tell that a sub-directory exists with a callback', function () {
            //TODO: Fix this so that it actually works on sub-directories.
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.mkdir('testDir')
                        .then(function () {
                            var cb = cbQ.cb();
                            s3fsImpl.exists('testDir/', cb);
                            return cb.promise;
                        });
                })).to.eventually.be.equal(true);
        });

        it("should be able to copy a directory recursively", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('testDir/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testDir/test/test.json', '{}');
                            });
                    })
                    .then(function () {
                        return s3fsImpl.copyDirectory('testDir', 'testCopyDirDestPromise');
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
                        return s3fsImpl.writeFile('testDir/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testDir/test/test.json', '{}');
                            });
                    })
                    .then(function () {
                        return s3fsImpl.copyDirectory('testDir', 'testCopyDirDestCb');
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
                        return s3fsImpl.writeFile('testDir/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testDir/test/test.json', '{}')
                                    .then(function () {
                                        return s3fsImpl.writeFile('testDir/test/test/test.json', '{}');
                                    })
                            })
                            .then(function () {
                                return s3fsImpl.rmdirp('testDir/test')
                                    .then(function () {
                                        return s3fsImpl.readdir('testDir');
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
                        return s3fsImpl.writeFile('testDir/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testDir/test/test.json', '{}')
                                    .then(function () {
                                        return s3fsImpl.writeFile('testDir/test/test/test.json', '{}');
                                    })
                            })
                            .then(function () {
                                return s3fsImpl.rmdirp('testDir/test')
                                    .then(function () {
                                        var cb = cbQ.cb();
                                        s3fsImpl.readdir('testDir', cb);
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
                        return s3fsImpl.writeFile('testDir/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testDir/test/test.json', '{}');
                            })
                            .then(function () {
                                return s3fsImpl.readdirp('testDir');
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
                        return s3fsImpl.writeFile('testDir/test.json', '{}')
                            .then(function () {
                                return s3fsImpl.writeFile('testDir/test/test.json', '{}');
                            })
                            .then(function () {
                                var cb = cbQ.cb();
                                s3fsImpl.readdirp('testDir', cb);
                                return cb.promise;
                            })
                    })
            ).to.eventually.satisfy(function (files) {
                    expect(files).to.have.length(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/test.json');
                    return true;
                });
        });

        it('should retrieve the stats of a directory - lstat(2)', function () {
            return expect(s3fsImpl.create()
                    .then(function() {
                        return s3fsImpl.mkdir('testDir/');
                    })
                    .then(function() {
                        return s3fsImpl.stat('testDir/');
                    })
            ).to.eventually.satisfy(function(stats) {
                    expect(stats.isDirectory()).to.be.true;
                    return true;
                });
        });

        it('should retrieve the stats of a directory with a callback - lstat(2)', function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.mkdir('testDir/');
                    })
                    .then(function () {
                        var cb = cbQ.cb();
                        s3fsImpl.stat('testDir/', cb);
                        return cb.promise;
                    })
            ).to.eventually.satisfy(function (stats) {
                    expect(stats.isDirectory()).to.be.true;
                    return true;
                });
        });

        it("should list all the files in a directory", function () {
            return expect(s3fsImpl.create()
                    .then(function() {
                        return s3fsImpl.mkdir('testDir/')
                            .then(function() {
                                return s3fsImpl.writeFile('testDir/test.json', '{}')
                                    .then(function() {
                                       return  s3fsImpl.writeFile('testDir/test/test.json', '{}');
                                    });
                            })
                    })
                    .then(function() {
                        return s3fsImpl.readdir('testDir/');
                    })
            ).to.eventually.satisfy(function(files) {
                    expect(files).to.have.length(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/');
                    return true;
                });
        });

        it("should list all the files in a directory with a callback", function () {
            return expect(s3fsImpl.create()
                    .then(function() {
                        return s3fsImpl.mkdir('testDir/')
                            .then(function() {
                                return s3fsImpl.writeFile('testDir/test.json', '{}')
                                    .then(function() {
                                       return  s3fsImpl.writeFile('testDir/test/test.json', '{}');
                                    });
                            })
                    })
                    .then(function() {
                        var cb = cbQ.cb();
                        s3fsImpl.readdir('testDir/', cb);
                        return cb.promise;
                    })
            ).to.eventually.satisfy(function(files) {
                    expect(files).to.have.length(2);
                    expect(files[0]).to.equal('test.json');
                    expect(files[1]).to.equal('test/');
                    return true;
                });
        });

        it("should be able to list all objects in a directory", function () {
            return expect(s3fsImpl.create()
                    .then(function() {
                        return s3fsImpl.mkdir('testDir/')
                            .then(function() {
                                return s3fsImpl.writeFile('testDir/test.json', '{}')
                                    .then(function() {
                                        return  s3fsImpl.writeFile('testDir/test/test.json', '{}');
                                    });
                            })
                    })
                    .then(function() {
                        return s3fsImpl.listContents('testDir/');
                    })
            ).to.eventually.satisfy(function(files) {
                    expect(files).to.have.length(2);
                    expect(files[0].Key).to.be.equal('testDir/');
                    expect(files[1].Key).to.be.equal('testDir/test.json');
                    return true;
                });
        });

        it("should be able to list all objects in a directory with a callback", function () {
            return expect(s3fsImpl.create()
                    .then(function() {
                        return s3fsImpl.mkdir('testDir/')
                            .then(function() {
                                return s3fsImpl.writeFile('testDir/test.json', '{}')
                                    .then(function() {
                                        return  s3fsImpl.writeFile('testDir/test/test.json', '{}');
                                    });
                            })
                    })
                    .then(function() {
                        var cb = cbQ.cb();
                        s3fsImpl.listContents('testDir/', cb);
                        return cb.promise;
                    })
            ).to.eventually.satisfy(function(files) {
                    expect(files).to.have.length(2);
                    expect(files[0].Key).to.be.equal('testDir/');
                    expect(files[1].Key).to.be.equal('testDir/test.json');
                    return true;
                });
        });

    });
}(require('chai'), require("chai-as-promised"), require('cb-q'), require('../')));