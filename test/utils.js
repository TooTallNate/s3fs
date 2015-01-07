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
(function (chai, chaiAsPromised, fsUtils) {
    'use strict';
    var expect = chai.expect;

    chai.use(chaiAsPromised);
    chai.config.includeStack = true;

    describe('S3FS Utils', function () {
        describe('isAbsolute(path)', function () {
            it('should be able to identify an absolute path of `/`', function () {
                return expect(fsUtils.isAbsolute('/')).to.be.true;
            });
            it('should be able to identify an absolute path of `a:\\`', function () {
                return expect(fsUtils.isAbsolute('a:\\')).to.be.true;
            });
            it('should be able to identify an absolute path of `\\\\`', function () {
                return expect(fsUtils.isAbsolute('\\\\')).to.be.true;
            });
            it('shouldn\'t identify `asdf` as an absolute path', function () {
                return expect(fsUtils.isAbsolute('asdf')).to.be.false;
            });
        });
        describe('normalizePath(path)', function () {
            it('should be able to normalize a path', function () {
                return expect(fsUtils.normalizePath('qwerty///asdf.txt')).to.be.equal('qwerty/asdf.txt');
            });
            it('should be able to normalize an absolute path', function () {
                return expect(fsUtils.normalizePath('/qwerty///asdf.txt')).to.be.equal('/qwerty/asdf.txt');
            });
        });
    });
}(require('chai'), require('chai-as-promised'), require('../lib/utils')));