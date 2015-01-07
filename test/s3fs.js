(function (fs, should, Q, s3fs) {
    "use strict";
    describe.skip("test s3fs", function () {
        var s3Credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_KEY,
                region: process.env.AWS_REGION
            },
            testBucket = process.env.BUCKET_NAME || 's3fs-test-bucket',
            s3fsImpl = new s3fs(s3Credentials, testBucket);

        before(function (done) {
            if (!s3Credentials.accessKeyId || !s3Credentials.secretAccessKey) {
                throw new Error('Both a AWS Access Key ID and Secret Key are required');
            }

            s3fsImpl.destroy().then(function () {
                s3fsImpl.create().then(function () {
                    done();
                }, function (reason) {
                    done(reason);
                });
            }, function (reason) {
                if (reason.code === 'NoSuchBucket') {
                    s3fsImpl.create().then(function () {
                        done();
                    }, function (reason) {
                        done(reason);
                    });
                } else {
                    done(reason);
                }
            });
        });
        //delete the test bucket
        after(function (done) {
            s3fsImpl.destroy().then(function () {
                done();
            }, function (reason) {
                done(reason);
            });
        });

        it('should update bucket lifecycle policy using promise', function (done) {
            var testExpireBucket = "testExpireBucketPromise.test";
            var prefix = 'cache';
            var days = 1;
            var s3fsExpire = new s3fs(s3Credentials, testExpireBucket);

            s3fsExpire.create().then(function () {
                s3fsExpire.putBucketLifecycle(testExpireBucket, prefix, days).then(function () {
//                    s3fsExpire.destroy().then(function(){
//                        done();
//                    });
                    done();
                }, function (reason) {
                    done(reason);
                });
            }, function (reason) {
                done(reason);
            });
        });

        it('should update bucket lifecycle policy using callback', function (done) {
            var testExpireBucket = "testExpireBucketCb.test";
            var prefix = 'cache';
            var days = 1;
            var s3fsExpire = new s3fs(s3Credentials, testExpireBucket);

            s3fsExpire.create().then(function () {
                s3fsExpire.putBucketLifecycle(testExpireBucket, prefix, days, function (err, data) {
                    if (err) {
                        done(err);
                    }
                    s3fsExpire.destroy().then(function () {
                        done();
                    });
                });
            }, function (reason) {
                done(reason);
            });
        });

        it("should delete a file to the bucket using promise", function (done) {
            s3fsImpl.unlink('testPromise.pdf').then(function (result) {
                done();
            }, function (reason) {
                done(reason);
            });
        });

        it("should delete a file to the bucket using cb", function (done) {
            s3fsImpl.unlink('testCb.pdf', function (err) {
                done(err);
            });
        });

        it("should be able to copy a single object with a promise", function (done) {
            s3fsImpl.writeFile('testCopyFilePromise/test.json', '{}').then(function () {
                s3fsImpl.copyObject('testCopyFilePromise/test.json', 'testCopyFileDestPromise/test2.json').then(function () {
                    s3fsImpl.exists('testCopyFileDestPromise/test2.json').then(function (exists) {
                        if (!exists) {
                            return done(new Error('File Not Exist'));
                        }
                        done();
                    });
                }, function (reason) {
                    done(reason);
                });
            }, function (reason) {
                done(reason);
            });
        });

        it("should be able to copy a single object with a callback", function (done) {
            s3fsImpl.writeFile('testCopyFileCb/test.json', '{}').then(function () {
                s3fsImpl.copyObject('testCopyFileCb/test.json', 'testCopyFileDestCb/test2.json', function (err) {
                    if (err) {
                        return done(err);
                    }
                    s3fsImpl.exists('testCopyFileDestCb/test2.json').then(function (exists) {
                        if (!exists) {
                            return done(new Error('File Not Exist'));
                        }
                        done();
                    });
                });
            }, function (reason) {
                done(reason);
            });
        });

        it("should be able to get the head of an object with promise", function (done) {
            s3fsImpl.writeFile('headTestPromise.json', '{}').then(function () {
                s3fsImpl.headObject('headTestPromise.json').then(function (data) {
                    data.ETag.should.be.exactly('"99914b932bd37a50b983c5e7c90ae93b"');
                    data.ContentLength.should.be.exactly('2');
                    done();
                }, function (reason) {
                    done(reason);
                });
            });
        });

        it("should be able to get the head of an object with callback", function (done) {
            s3fsImpl.writeFile('headTestCb.json', '{}').then(function () {
                s3fsImpl.headObject('headTestCb.json', function (err, data) {
                    try {
                        data.ETag.should.be.exactly('"99914b932bd37a50b983c5e7c90ae93b"');
                        data.ContentLength.should.be.exactly('2');
                        done(err);
                    } catch (err) {
                        done(err);
                    }
                });
            });
        });

        it("should be able to clone s3fs", function (done) {
            s3fsImpl.writeFile('clone/test.json', '{}').then(function () {
                var s3fsClone = s3fsImpl.clone('clone');
                s3fsClone.readFile('test.json').then(function () {
                    done();
                }, done);
            });
        });

    });
}(require('fs'), require('should'), require('q'), require('../')));