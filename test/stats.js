/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Riptide Software Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function (chai, chaiAsPromised, Stats) {
    'use strict';
    var expect = chai.expect;

    chai.use(chaiAsPromised);
    chai.config.includeStack = true;

    describe('S3FS Stats', function () {

        it('should be able create an object', function () {
            return expect(new Stats()).to.not.throw;
        });

        it('should be able create an object without `new`', function () {
            return expect(new Stats()).to.not.throw;
        });

        it('shouldn\'t be able create an object without an object', function () {
            return expect(function () {
                Stats.create('');
            }).to.throw('object is required to create a Stats');
        });

        it('should be able to check if the object is for a directory', function () {
            return expect(new Stats({path: '/'}).isDirectory()).to.be.true;
        });

        it('shouldn\'t consider a file to be a directory', function () {
            return expect(new Stats({path: '/asdf.txt'}).isDirectory()).to.be.false;
        });

        it('should be able to check if the object is for a file', function () {
            return expect(new Stats({path: '/asdf.txt'}).isFile()).to.be.true;
        });

        it('shouldn\'t consider a directory to be a file', function () {
            return expect(new Stats({path: '/'}).isFile()).to.be.false;
        });

        it('should be able to check if the object is a block device', function () {
            return expect(new Stats({path: '/'}).isBlockDevice()).to.be.false;
        });

        it('should be able to check if the object is a character device', function () {
            return expect(new Stats({path: '/'}).isCharacterDevice()).to.be.false;
        });

        it('should be able to check if the object is a symbolic link', function () {
            return expect(new Stats({path: '/'}).isSymbolicLink()).to.be.false;
        });

        it('should be able to check if the object is FIFO', function () {
            return expect(new Stats({path: '/'}).isFIFO()).to.be.false;
        });

        it('should be able to check if the object is a socket', function () {
            return expect(new Stats({path: '/'}).isSocket()).to.be.false;
        });

    });
}(require('chai'), require('chai-as-promised'), require('../lib/Stats')));