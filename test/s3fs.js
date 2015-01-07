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