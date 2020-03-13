/* eslint-disable sonarjs/no-duplicate-string */
// @ts-ignore
const pkg = require('../package.json')

const [homepage] = pkg.homepage.split('#')
/**
 * @param {string} file -
 * @returns {string} -
 * @example
 * const link = linkify(href)
 */
const linkify = file => `${homepage}/blob/master/${file}`

/**
 * @typedef {import('./types').Context} Context
 */
/**
 * @typedef {Object} SemanticReleaseError
 * @property {string} message -
 * @property {string} details -
 */

module.exports = new Map([
  [
    'ENOACCESSKEYID',
    /**
     * @param {Context} ctx -
     * @returns {SemanticReleaseError} -
     */
    ctx => ({
      message: 'No aws access key id specified.',
      details: `An [aws access key id](${linkify(
        'README.md#environment-variables'
      )}) must be created and set in the \`AWS_ACCESS_KEY_ID\` environment variable on your CI environment.`
    })
  ],
  [
    'ENOSECRETACCESSKEY',
    /**
     * @param {Context} ctx -
     * @returns {SemanticReleaseError} -
     */
    ctx => ({
      message: 'No aws secret access key specified.',
      details: `An [aws secret access key](${linkify(
        'README.md#environment-variables'
      )}) must be created and set in the \`AWS_SECRET_ACCESS_KEY\` environment variable on your CI environment.`
    })
  ],
  [
    'ECREDENTIALS',
    /**
     * @param {Context} ctx -
     * @returns {SemanticReleaseError} -
     */
    ctx => ({
      message: 'No aws credentials specified.',
      details: `An [aws credentials](${linkify(
        'README.md#environment-variables'
      )}) must be created and set in the \`AWS_ACCESS_KEY_ID\` and \`AWS_SECRET_ACCESS_KEY\` environment variable on your CI environment.`
    })
  ],
  [
    'ENOSERVICES',
    /**
     * @param {Context} ctx -
     * @returns {SemanticReleaseError} -
     */
    ctx => ({
      message: 'No services specified.',
      details: `The [services options](${linkify(
        'README.md#options'
      )}), if defined, must be a array of service object.`
    })
  ],
  [
    'ENOSERVICE',
    /**
     * @param {Context} ctx -
     * @returns {SemanticReleaseError} -
     */
    ctx => ({
      message: 'No service name specified.',
      details: `The [service.service options](${linkify(
        'README.md#options'
      )}), if defined, must be a string with service name.`
    })
  ],
  [
    'ENOCLUSTER',
    /**
     * @param {Context} ctx -
     * @returns {SemanticReleaseError} -
     */
    ctx => ({
      message: 'No cluster name specified.',
      details: `The [service.cluster options](${linkify(
        'README.md#options'
      )}), if defined, must be a string with cluster name.`
    })
  ],
  [
    'EDEPLOY',
    /**
     * @param {Context} ctx -
     * @returns {SemanticReleaseError} -
     */
    ctx => ({
      message: 'Error executing update-service.',
      details: 'Error executing update-service.'
    })
  ]
])
/* eslint-enable sonarjs/no-duplicate-string */
