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

        it("should be able to clone s3fs", function () {
            return expect(s3fsImpl.clone('imAClone')).to.not.throw;
        });

        it("should be able to clone s3fs then read a file", function () {
            return expect(s3fsImpl.create()
                    .then(function () {
                        return s3fsImpl.writeFile('imAClone/test-file.json', '{ "test": "test" }');
                    })
                    .then(function () {
                        var s3fsClone = s3fsImpl.clone('imAClone');
                        return s3fsClone.readFile('test-file.json');
                    })
            ).to.eventually.satisfy(function (file) {
                    expect(file.Body.toString()).to.be.equal('{ "test": "test" }');
                    return true;
                });
        });

    });
}(require('chai'), require("chai-as-promised"), require('fs'), require('cb-q'), require('q'), require('../')));