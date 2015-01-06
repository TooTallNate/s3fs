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

        it("should add a file to the bucket using promise", function (done) {
            fs.readFile('./test/files/test.pdf', function (err, data) {
                if (err) {
                    return done(err);
                }
                s3fsImpl.writeFile('testPromise.pdf', data).then(function (result) {
                    done();
                }, function (reason) {
                    done(reason);
                });
            });
        });

        it("should add a file to the bucket using cb", function (done) {
            fs.readFile('./test/files/test.pdf', function (err, data) {
                if (err) {
                    return done(err);
                }
                s3fsImpl.writeFile('testCb.pdf', data, function (err) {
                    done(err);
                });
            });
        });

        it("should write a file to the bucket as a stream", function (done) {
            fs.createReadStream('./test/files/test.pdf').pipe(s3fsImpl.createWriteStream('testStream.pdf'))
                .on('finish', function () {
                    done();
                })
                .on('error', function (err) {
                    done(err);
                });
        });

        it("should write a large file to the bucket as a stream", function (done) {
            fs.createReadStream('./test/files/video.mp4').pipe(s3fsImpl.createWriteStream('video.mp4'))
                .on('finish', function () {
                    done();
                })
                .on('error', function (err) {
                    done(err);
                });
        });

        it("should read the file as a stream", function (done) {
            s3fsImpl.createReadStream('testStream.pdf')
                .on('data', function (data) {
                    //consume the stream
                })
                .on('end', function () {
                    done();
                })
                .on('error', function (error) {
                    done(error);
                });
        });

        it("should add a directory to the bucket and return a promise", function (done) {
            s3fsImpl.mkdir('testDirPromise').then(function () {
                done();
            }, function (reason) {
                done(reason);
            });
        });

        it("should add a directory to the bucket cb", function (done) {
            s3fsImpl.mkdir('testDirCb', function (err) {
                done(err);
            });
        });

        it('should be able to tell that a directory exists', function (done) {
            s3fsImpl.exists('/', function (exists) {
                try {
                    exists.should.be.exactly(true);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it("should test that the file exists with promise", function (done) {
            s3fsImpl.exists('testPromise.pdf').then(function (data) {
                try {
                    data.ETag.should.be.exactly('"e5b1c268883f47d891d84d3cad624b3c"');
                    done();
                } catch (err) {
                    done(err);
                }
            }, function (reason) {
                done(reason);
            });
        });

        it("should test that the file exists with cb", function (done) {
            s3fsImpl.exists('testPromise.pdf', function (exists) {
                exists.should.be.exactly(true);
                done();
            });
        });

        it("should list all objects in the bucket with promise", function (done) {
            s3fsImpl.dstat('/', null).then(function (contents) {
                try {
                    contents.should.be.an.instanceof(Array);
                    contents.should.have.length(4);
                    done();
                } catch (err) {
                    done(err);
                }
            }, function (reason) {
                done(reason);
            });
        });

        it("should list all objects in the bucket with cb", function (done) {
            s3fsImpl.dstat('/', null, function (err, contents) {
                try {
                    contents.should.be.an.instanceof(Array);
                    contents.should.have.length(4);
                    done(err);
                } catch (err) {
                    done(err);
                }
            });
        });

        it("should list all the files in the bucket with promise", function (done) {
            s3fsImpl.readdir('/').then(function (files) {
                try {
                    files.should.be.an.instanceof(Array);
                    files.should.have.length(6);
                    done();
                } catch (err) {
                    done(err);
                }
            }, function (reason) {
                done(reason);
            });
        });

        it("should list all the files in the bucket with cb", function (done) {
            s3fsImpl.readdir('/', function (err, files) {
                try {
                    files.should.be.an.instanceof(Array);
                    files.should.have.length(6);
                    done(err);
                } catch (err) {
                    done(err);
                }
            });
        });

        it("should list all the files in a directory with a promise", function (done) {
            Q.all(s3fsImpl.writeFile('testListDirPromise/test.json', '{}'), s3fsImpl.writeFile('testListDirPromise/test/test.json', '{}')).spread(function (test1,
                                                                                                                                                            test2) {
                s3fsImpl.readdir('testListDirPromise/').then(function (files) {
                    try {
                        files.should.be.an.instanceof(Array);
                        files.length.should.be.exactly(2);
                        files[0].should.be.exactly('test.json');
                        files[1].should.be.exactly('test/');
                        done();
                    } catch (err) {
                        done(err);
                    }
                }, function (reason) {
                    done(reason);
                });
            });
        });

        it("should list all the files in a directory with a callback", function (done) {
            Q.all(s3fsImpl.writeFile('testListDirPromise/test.json', '{}'), s3fsImpl.writeFile('testListDirPromise/test/test.json', '{}')).spread(function (test1,
                                                                                                                                                            test2) {
                s3fsImpl.readdir('testListDirPromise/', function (err, files) {
                    try {
                        files.should.be.an.instanceof(Array);
                        files.length.should.be.exactly(2);
                        files[0].should.be.exactly('test.json');
                        files[1].should.be.exactly('test/');
                        done(err);
                    } catch (err) {
                        done(err);
                    }
                });
            });
        });

        it("should list all the files in a directory with cb", function (done) {
            s3fsImpl.readdir('/', function (err, files) {
                try {
                    files.should.be.an.instanceof(Array);
                    files.should.have.length(7);
                    done(err);
                } catch (err) {
                    done(err);
                }
            });
        });

        it("should remove a directory and return a promise", function (done) {
            s3fsImpl.rmdir('testDirPromise').then(function () {
                done();
            }, function (reason) {
                done(reason);
            });
        });

        it("should remove a directory cb", function (done) {
            s3fsImpl.rmdir('testDirCb', function (err) {
                done(err);
            });
        });

        it("should delete files in the bucket using promise", function (done) {
            Q.all(s3fsImpl.writeFile('testDeleteDirFiles/test.json', '{}'), s3fsImpl.writeFile('testDeleteDirFiles/test/test.json', '{}')).spread(function (test1,
                                                                                                                                                            test2) {
                s3fsImpl.rmFiles(['testDeleteDirFiles/test.json', 'testDeleteDirFiles/test/test.json']).then(function (files) {
                    var errors = files.Errors;
                    (errors.length === 0).should.be.true;
                    var deleted = files.Deleted;
                    (deleted.length === 2).should.be.true;
                    done();
                }, function (reason) {
                    done(reason);
                });
            });
        });

        it("should delete files in the bucket using cb", function (done) {
            Q.all(s3fsImpl.writeFile('testDeleteDirFiles/test.json', '{}'), s3fsImpl.writeFile('testDeleteDirFiles/test/test.json', '{}')).spread(function (test1,
                                                                                                                                                            test2) {
                s3fsImpl.rmFiles(['testDeleteDirFiles/test.json', 'testDeleteDirFiles/test/test.json']).then(function (files) {
                    var errors = files.Errors;
                    (errors.length === 0).should.be.true;
                    var deleted = files.Deleted;
                    (deleted.length === 2).should.be.true;
                    done();
                }, function (reason) {
                    done(reason);
                });
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

        it("should retrieve the stats of a file - stat(2)", function (done) {
            fs.createReadStream('./test/files/test.pdf').pipe(s3fsImpl.createWriteStream('testStat.pdf'))
                .on('finish', function () {
                    fs.stat('./test/files/test.pdf', function (err, fsStats) {
                        if (err) {
                            return done(err);
                        }
                        var size = fsStats.size;

                        s3fsImpl.stat('testStat.pdf', function (err, s3Stats) {
                            if (err) {
                                return done(err);
                            }
                            try {
                                s3Stats.size.should.be.exactly(size);
                                s3Stats.isFile().should.be.true;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        });
                    });
                })
                .on('error', function (err) {
                    done(err);
                });
        });

        it('should retrieve the stats of a directory - stat(2)', function (done) {
            s3fsImpl.mkdir('testStatDirCb/', function (err) {
                if (err) {
                    return done(err);
                }

                s3fsImpl.stat('testStatDirCb/', function (err, s3Stats) {
                    if (err) {
                        return done(err);
                    }
                    try {
                        s3Stats.isDirectory().should.be.true;
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
        });

        it("should retrieve the stats of a file - lstat(2)", function (done) {
            fs.createReadStream('./test/files/test.pdf').pipe(s3fsImpl.createWriteStream('testLStat.pdf'))
                .on('finish', function () {
                    fs.lstat('./test/files/test.pdf', function (err, fsStats) {
                        if (err) {
                            return done(err);
                        }
                        var size = fsStats.size;

                        s3fsImpl.lstat('testLStat.pdf', function (err, s3Stats) {
                            if (err) {
                                return done(err);
                            }
                            try {
                                s3Stats.size.should.be.exactly(size);
                                s3Stats.isFile().should.be.true;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        });
                    });
                })
                .on('error', function (err) {
                    done(err);
                });
        });

        it('should retrieve the stats of a directory - lstat(2)', function (done) {
            s3fsImpl.mkdir('testLStatDirCb/', function (err) {
                if (err) {
                    return done(err);
                }

                s3fsImpl.stat('testLStatDirCb/', function (err, s3Stats) {
                    if (err) {
                        return done(err);
                    }
                    try {
                        s3Stats.isDirectory().should.be.true;
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
        });

        it("should retrieve the stats of a file using a callback - stat(2)", function (done) {
            fs.createReadStream('./test/files/test.pdf').pipe(s3fsImpl.createWriteStream('testStatCb.pdf'))
                .on('finish', function () {
                    fs.stat('./test/files/test.pdf', function (err, fsStats) {
                        if (err) {
                            return done(err);
                        }
                        var size = fsStats.size;

                        s3fsImpl.stat('testStatCb.pdf', function (err, s3Stats) {
                            if (err) {
                                return done(err);
                            }
                            try {
                                s3Stats.size.should.be.exactly(size);
                                s3Stats.isFile().should.be.true;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        });
                    });
                })
                .on('error', function (err) {
                    done(err);
                });
        });

        it("should retrieve the stats of a file using a promise - stat(2)", function (done) {
            fs.createReadStream('./test/files/test.pdf').pipe(s3fsImpl.createWriteStream('testStatPromise.pdf'))
                .on('finish', function () {
                    fs.stat('./test/files/test.pdf', function (err, fsStats) {
                        if (err) {
                            return done(err);
                        }
                        var size = fsStats.size;

                        s3fsImpl.stat('testStatPromise.pdf').then(function (s3Stats) {
                            try {
                                s3Stats.size.should.be.exactly(size);
                                s3Stats.isFile().should.be.true;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        }, function (reason) {
                            done(reason);
                        });
                    });
                })
                .on('error', function (err) {
                    done(err);
                });
        });

        it('should retrieve the stats of a directory using a callback - stat(2)', function (done) {
            s3fsImpl.mkdir('testStatDirCb/', function (err) {
                if (err) {
                    return done(err);
                }

                s3fsImpl.stat('testStatDirCb/', function (err, s3Stats) {
                    if (err) {
                        return done(err);
                    }
                    try {
                        s3Stats.isDirectory().should.be.true;
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
        });

        it('should retrieve the stats of a directory using a promise - stat(2)', function (done) {
            s3fsImpl.mkdir('testStatDirPromise/', function (err) {
                if (err) {
                    return done(err);
                }

                s3fsImpl.stat('testStatDirPromise/').then(function (s3Stats) {
                    if (err) {
                        return done(err);
                    }
                    try {
                        s3Stats.isDirectory().should.be.true;
                        done();
                    } catch (err) {
                        done(err);
                    }
                }, function (reason) {
                    done(reason);
                });
            });
        });

        it("should retrieve the stats of a file using a callback - lstat(2)", function (done) {
            fs.createReadStream('./test/files/test.pdf').pipe(s3fsImpl.createWriteStream('testLStatCb.pdf'))
                .on('finish', function () {
                    fs.lstat('./test/files/test.pdf', function (err, fsStats) {
                        if (err) {
                            return done(err);
                        }
                        var size = fsStats.size;

                        s3fsImpl.lstat('testLStatCb.pdf', function (err, s3Stats) {
                            if (err) {
                                return done(err);
                            }
                            try {
                                s3Stats.size.should.be.exactly(size);
                                s3Stats.isFile().should.be.true;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        });
                    });
                })
                .on('error', function (err) {
                    done(err);
                });
        });

        it("should retrieve the stats of a file using a promise - lstat(2)", function (done) {
            fs.createReadStream('./test/files/test.pdf').pipe(s3fsImpl.createWriteStream('testLStatPromise.pdf'))
                .on('finish', function () {
                    fs.lstat('./test/files/test.pdf', function (err, fsStats) {
                        if (err) {
                            return done(err);
                        }
                        var size = fsStats.size;

                        s3fsImpl.lstat('testLStatPromise.pdf').then(function (s3Stats) {
                            try {
                                s3Stats.size.should.be.exactly(size);
                                s3Stats.isFile().should.be.true;
                                done();
                            } catch (err) {
                                done(err);
                            }
                        }, function (reason) {
                            done(reason);
                        });
                    });
                })
                .on('error', function (err) {
                    done(err);
                });
        });

        it('should retrieve the stats of a directory using a callback - lstat(2)', function (done) {
            s3fsImpl.mkdir('testLStatDirCb/', function (err) {
                if (err) {
                    return done(err);
                }

                s3fsImpl.stat('testLStatDirCb/', function (err, s3Stats) {
                    if (err) {
                        return done(err);
                    }
                    try {
                        s3Stats.isDirectory().should.be.true;
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
        });

        it('should retrieve the stats of a directory using a promise - lstat(2)', function (done) {
            s3fsImpl.mkdir('testLStatDirPromise/', function (err) {
                if (err) {
                    return done(err);
                }

                s3fsImpl.stat('testLStatDirPromise/').then(function (s3Stats) {
                    try {
                        s3Stats.isDirectory().should.be.true;
                        done();
                    } catch (err) {
                        done(err);
                    }
                }, function (reason) {
                    done(reason);
                });
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

        it("should list all the files in a directory recursively with callback", function (done) {
            Q.all(s3fsImpl.writeFile('testCopyDirCb/test.json', '{}'), s3fsImpl.writeFile('testCopyDirCb/test/test.json', '{}')).then(function () {
                s3fsImpl.readdirp('testCopyDirCb', function (err, files) {
                    try {
                        files.should.be.an.instanceof(Array);
                        files.should.have.length(2);
                        files[0].should.be.exactly('test.json');
                        files[1].should.be.exactly('test/test.json');
                        done(err);
                    } catch (err) {
                        done(err);
                    }
                });
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