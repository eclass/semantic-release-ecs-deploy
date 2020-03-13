const { promisify } = require('util')

const AggregateError = require('aggregate-error')
const awscred = require('awscred')

const getError = require('./get-error')

const load = promisify(awscred.load)

/**
 * @typedef {import('./types').Context} Context
 * @typedef {import('./types').Config} Config
 */
/**
 * @param {Config} pluginConfig -
 * @param {Context} ctx -
 * @returns {Promise<void>} -
 * @example
 * verifyConditions(pluginConfig, ctx)
 */
module.exports = async (pluginConfig, ctx) => {
  const errors = []
  try {
    const data = await load()
    if (!data.credentials.accessKeyId) {
      errors.push(getError('ENOACCESSKEYID', ctx))
    }
    if (!data.credentials.secretAccessKey) {
      errors.push(getError('ENOSECRETACCESSKEY', ctx))
    }
    if (!pluginConfig.services || pluginConfig.services.length === 0) {
      errors.push(getError('ENOSERVICES', ctx))
    }
    pluginConfig.services.forEach(({ service, cluster }) => {
      if (!service) {
        errors.push(getError('ENOSERVICE', ctx))
      }
      if (!cluster) {
        errors.push(getError('ENOCLUSTER', ctx))
      }
    })
    if (errors.length > 0) {
      throw new AggregateError(errors)
    }
  } catch (err) {
    errors.push(getError('ECREDENTIALS', ctx))
    throw new AggregateError(errors)
  }
}
