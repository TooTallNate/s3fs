# S3FS

Implementation of Node.JS [FS interface](http://nodejs.org/api/fs.html) using [Amazon Simple Storage Service (S3)](http://aws.amazon.com/s3/) for storage.

## Purpose
S3FS provides a drop-in replacement for the File System (FS) implementation that is available with Node.JS allowing a distributed file-system to be used
by Node.JS applications through the well-known [FS interface](http://nodejs.org/api/fs.html) used by Node.JS.

## Minimum IAM Policy
Below is a policy for AWS [Identity and Access Management](http://aws.amazon.com/iam/) which provides the minimum privileges needed to use S3FS.

```json
{
  "Statement": [
    {
      "Action": [
        "s3:ListBucket"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::your-bucket"
      ]
    },
    {
      "Action": [
        "s3:AbortMultipartUpload",
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:DeleteBucketPolicy",
        "s3:DeleteObject",
        "s3:GetBucketPolicy",
        "s3:GetLifecycleConfiguration",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads",
        "s3:ListMultipartUploadParts",
        "s3:PutBucketPolicy",
        "s3:PutLifecycleConfiguration",
        "s3:PutObject"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::your-bucket/*"
      ]
    }
  ]
}
```

## Testing
This repository uses [Mocha](http://mochajs.org/) as its test runner. Tests can be run by executing the following command:

```bash
npm test
```

This will run all tests and report on their success/failure in the console, additionally it will include our [Code Coverage](#code-coverage).

## Code Coverage
This repository uses [Istanbul](http://gotwarlost.github.io/istanbul/) as its code coverage tool. Code Coverage will be calculated when executing the following command:

```bash
npm test
```

This will report the Code Coverage to the console similar to the following:

```bash
=============================== Coverage summary ===============================
Statements   : 78.07% ( 356/456 )
Branches     : 50.23% ( 107/213 )
Functions    : 74.77% ( 83/111 )
Lines        : 78.07% ( 356/456 )
================================================================================
```

Additionally, an interactive HTML report will be generated in `./coverage/lcov-report/index.html` which allows browsing the coverage by file.

## Code Style
This repository uses [JSHint](https://github.com/jshint/jshint) for static analysis, [JavaScript Code Style](https://github.com/jscs-dev/node-jscs)
for validating code style, [JSInspect](https://github.com/danielstjules/jsinspect) to detect code duplication, [Buddy.js](https://github.com/danielstjules/buddy.js)
to detect the use of [Magic Numbers](http://en.wikipedia.org/wiki/Magic_number_(programming)),
and [Node Security Project](https://github.com/nodesecurity/nsp) for detecting potential security threats with our dependencies.

To run the code quality tools above, simply execute the following command:

```bash
npm run inspect
```

This will create files with the results in the `reports` directory.

## ToDo
* Switch from Encrypted Environment Variables to using Travis-CI Environment Variables in the console
* More tests
* More documentation
* Eat more cookies
* Move over to `cb-q` to simplify supporting promises and callbacks

## Copyright
> Copyright (c) 2014 Riptide Software