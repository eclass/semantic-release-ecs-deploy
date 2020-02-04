const { promisify } = require('util')

const AggregateError = require('aggregate-error')
const aws = require('aws-sdk')
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
 * publish(pluginConfig, ctx)
 */
module.exports = async (pluginConfig, ctx) => {
  try {
    const {
      credentials: { accessKeyId, secretAccessKey },
      region
    } = await load()
    const ecs = new aws.ECS({ region, accessKeyId, secretAccessKey })
    await ecs
      .updateService({
        cluster: pluginConfig.cluster,
        service: pluginConfig.service,
        forceNewDeployment: true
      })
      .promise()
  } catch (err) {
    throw new AggregateError([getError('EDEPLOY', ctx)])
  }
}
