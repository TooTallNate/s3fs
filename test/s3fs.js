/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Riptide Software Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software'), to deal
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
(function (chai, chaiAsPromised, S3FS) {
    'use strict';
    var expect = chai.expect;

    chai.use(chaiAsPromised);
    chai.config.includeStack = true;

    describe('S3FS Instances', function () {
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
            bucketName = 's3fs-clone-test-bucket-' + (Math.random() + '').slice(2, 8);
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

        it('shouldn\'t be able to instantiate S3FS without a bucket', function () {
            return expect(function () {
                S3FS();
            }).to.throw(Error, 'bucket is required');
        });

        it('shouldn\'t be able to instantiate S3FS with an invalid bucket', function () {
            return expect(function () {
                S3FS({});
            }).to.throw(Error, 'bucket must be a string');
        });

        it('should be able to instantiate S3FS without options', function () {
            return expect(function () {
                S3FS('bucket');
            }).to.not.throw();
        });

        it('shouldn\'t be able to instantiate S3FS without an accessKeyId', function () {
            return expect(function () {
                S3FS('bucket', {});
            }).to.not.throw();
        });

        it('shouldn\'t be able to instantiate S3FS without a secretAccessKey', function () {
            return expect(function () {
                S3FS('bucket', {accessKeyId: 'test'});
            }).to.not.throw();
        });

        it('should be able to clone s3fs', function () {
            return expect(bucketS3fsImpl.clone('imAClone')).to.not.throw;
        });

        it('should be able to clone s3fs then read a file', function () {
            return expect(bucketS3fsImpl.writeFile('imAClone/test-file.json', '{ "test": "test" }')
                    .then(function () {
                        var s3fsClone = bucketS3fsImpl.clone('imAClone');
                        return s3fsClone.readFile('test-file.json');
                    })
            ).to.eventually.satisfy(function (file) {
                    expect(file.Body.toString()).to.be.equal('{ "test": "test" }');
                    return true;
                });
        });

    });
}(require('chai'), require('chai-as-promised'), require('../')));