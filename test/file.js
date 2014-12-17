(function (chai, chaiAsPromised, fs, cbQ, s3fs) {
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

        it("should be able to store a file from a string in a bucket", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                })).to.eventually.be.fulfilled;
        });

        it("should be able to store a file from a string in a bucket with a callback", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', '{ "test": "test" }', cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it("shouldn\'t be able to store a file from an object in a bucket", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', {"test": "test"});
                })).to.eventually.be.rejectedWith('Expected params.Body to be a string, Buffer, Stream, Blob, or typed array object');
        });

        it("shouldn\'t be able to store a file from an object in a bucket with a callback", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', {"test": "test"}, cb);
                    return cb.promise;
                })).to.eventually.be.rejectedWith('Expected params.Body to be a string, Buffer, Stream, Blob, or typed array object');
        });

        it.skip("should be able to store a file from a buffer in a bucket", function () {
            //TODO: Get this working.
            var buffer = new Buffer(),
                fd = fs.openSync('test/mock/example-file.json', 'r');

            fs.readSync(fd, buffer);

            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', buffer);
                })).to.eventually.be.fulfilled;
        });

        it.skip("should be able to store a file from a buffer in a bucket with a callback", function () {
            //TODO: Get this working.
            var buffer = new Buffer(),
                fd = fs.openSync('test/mock/example-file.json', 'r');

            fs.readSync(fd, buffer);

            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', buffer, cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it("should be able to store a file from a stream in a bucket", function () {
            var stream = fs.createReadStream('./test/mock/example-file.json');

            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', stream);
                })).to.eventually.be.fulfilled;
        });

        it("should be able to store a file from a stream in a bucket with a callback", function () {
            var stream = fs.createReadStream('./test/mock/example-file.json');

            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', stream, cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it.skip("should be able to store a file from a blob in a bucket", function () {
            //TODO: Get this setup
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', {"test": "test"});
                })).to.eventually.be.fulfilled;
        });

        it.skip("should be able to store a file from a blob in a bucket with a callback", function () {
            //TODO: Get this setup
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', {"test": "test"}, cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it.skip("should be able to store a file from a typed array in a bucket", function () {
            //TODO: Get this setup
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', {"test": "test"});
                })).to.eventually.be.fulfilled;
        });

        it.skip("should be able to store a file from a typed array in a bucket with a callback", function () {
            //TODO: Get this setup
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', {"test": "test"}, cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

        it("should be able to write a file to the bucket using streams", function (done) {
                s3fsImpl.create().then(function () {
                    fs.createReadStream('./test/mock/example-file.json')
                        .pipe(s3fsImpl.createWriteStream('test-file.json'))
                        .on('finish', done)
                        .on('error', done);
                }, done);
        });

        it("should be able to tell if a file exists", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    return s3fsImpl.writeFile('test-file.json', '{ "test": "test" }');
                })).to.eventually.be.fulfilled;
        });

        it("should be able to store a file from a string in a bucket with a callback", function () {
            return expect(s3fsImpl.create()
                .then(function () {
                    var cb = cbQ.cb();
                    s3fsImpl.writeFile('test-file.json', '{ "test": "test" }', cb);
                    return cb.promise;
                })).to.eventually.be.fulfilled;
        });

    });
}(require('chai'), require("chai-as-promised"), require('fs'), require('cb-q'), require('../')));