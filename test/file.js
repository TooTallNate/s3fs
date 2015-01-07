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
                        .on('finish', function() {
                            deferred.resolve();
                        })
                        .on('error', function(err) {
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
                        .on('finish', function() {
                            deferred.resolve();
                        })
                        .on('error', function(err) {
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

        it("should be able to tell if a file exists", function () {
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

    });
}(require('chai'), require("chai-as-promised"), require('fs'), require('cb-q'), require('q'), require('../')));