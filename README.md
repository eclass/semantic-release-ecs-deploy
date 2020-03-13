# @eclass/semantic-release-ecs-deploy

[![npm](https://img.shields.io/npm/v/@eclass/semantic-release-ecs-deploy.svg)](https://www.npmjs.com/package/@eclass/semantic-release-ecs-deploy)
![Node.js CI](https://github.com/eclass/semantic-release-docker/workflows/Node.js%20CI/badge.svg)
[![downloads](https://img.shields.io/npm/dt/@eclass/semantic-release-ecs-deploy.svg)](https://www.npmjs.com/package/@eclass/semantic-release-ecs-deploy)
[![dependencies](https://img.shields.io/david/eclass/semantic-release-ecs-deploy.svg)](https://david-dm.org/eclass/semantic-release-ecs-deploy)
[![devDependency Status](https://img.shields.io/david/dev/eclass/semantic-release-ecs-deploy.svg)](https://david-dm.org/eclass/semantic-release-ecs-deploy#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/github/eclass/semantic-release-ecs-deploy/badge.svg?branch=master)](https://coveralls.io/github/eclass/semantic-release-ecs-deploy?branch=master)
[![Maintainability](https://api.codeclimate.com/v1/badges/f84f0bcb39c9a5c5fb99/maintainability)](https://codeclimate.com/github/eclass/semantic-release-ecs-deploy/maintainability)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

> [semantic-release](https://github.com/semantic-release/semantic-release) plugin to deploy ecs services

| Step               | Description                                                                                 |
|--------------------|---------------------------------------------------------------------------------------------|
| `verifyConditions` | Verify the presence of the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variable. |
| `publish`          | Upgrade service in aws ecs.                                                                   |

## Install

```bash
npm i -D @eclass/semantic-release-ecs-deploy
```

## Usage

The plugin can be configured in the [**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/caribou/docs/usage/configuration.md#configuration):

```json
{
  "plugins": [
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/git",
    "@semantic-release/gitlab",
    [
      "@eclass/semantic-release-ecs-deploy",
      {
        "services": [
          {
            "cluster": "mycluster",
            "service": "myservice"
          }
        ]
      }
    ]
  ]
}
```

## Configuration

### Environment variables

| Variable             | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID` | aws access key id |
| `AWS_SECRET_ACCESS_KEY` | aws secret access key |

### Options

| Variable             | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `services` | Array of object `service`. Required. |
| `service`.`cluster` | Name of cluster in aws ecs. Required. |
| `service`.`service` | Name of service in aws ecs. Required. |
| `service`.`timeout` | Timeout in seconds to wait upgrade. Optional. Default `300` |
| `service`.`ignoreWarnings` | Flag to ignore warnings in upgrade. Optional. Default `false` |

### Examples

```json
{
  "plugins": [
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/git",
    "@semantic-release/gitlab",
    [
      "@eclass/semantic-release-ecs-deploy",
      {
        "services": [
          {
            "cluster": "mycluster",
            "service": "myservice",
            "timeout": -1,
            "ignoreWarnings": true
          }
        ]
      }
    ]
  ]
}
```

```yml
# .gitlab-ci.yml
release:
  image: node:alpine
  stage: release
  script:
    - npx semantic-release
  only:
    - master
```

```yml
# .travis.yml
language: node_js
cache:
  directories:
    - ~/.npm
node_js:
  - "12"
stages:
  - test
  - name: deploy
    if: branch = master
jobs:
  include:
    - stage: test
      script: npm t
    - stage: deploy
      script: npx semantic-release

```

## License

[MIT](https://tldrlegal.com/license/mit-license)
