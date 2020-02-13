const { promisify } = require('util')

const AggregateError = require('aggregate-error')
const aws = require('aws-sdk')
const awscred = require('awscred')

const getError = require('./get-error')

const load = promisify(awscred.load)

/**
 * @typedef {import('./types').Context} Context
 * @typedef {import('./types').Config} Config
 * @typedef {import('aws-sdk').ECS.Service} Service
 * @typedef {import('aws-sdk').ECS.Deployment} Deployment
 * @typedef {import('aws-sdk').ECS.Deployments} Deployments
 * @typedef {import('aws-sdk').ECS} ECS
 * @typedef {import('aws-sdk').EventBridge} EventBridge
 */
/**
 * @param {ECS} ecs -
 * @param {Service} service -
 * @param {string} cluster -
 * @returns {Promise<boolean>} -
 * @example
 * const deployed = await isDeployed(ecs, service, 'myCluster')
 */
const isDeployed = async (ecs, service, cluster) => {
  if (service.deployments.length !== 1) return false
  const { taskArns } = await ecs
    .listTasks({
      cluster,
      serviceName: service.serviceName
    })
    .promise()
  if (!taskArns) return service.desiredCount === 0
  const { tasks } = await ecs
    .describeTasks({
      cluster,
      tasks: taskArns
    })
    .promise()
  const runningCount = tasks.reduce((count, task) => {
    if (
      task.taskDefinitionArn === service.taskDefinition &&
      task.lastStatus === 'RUNNING'
    ) {
      count += 1
    }
    return count
  }, 0)
  return service.desiredCount === runningCount
}

/**
 * @param {ECS} ecs -
 * @param {string} cluster -
 * @param {string} service -
 * @returns {Promise<Service>} -
 * @example
 * const service = await getService(ecs, 'myCluster', 'myService')
 */
const getService = async (ecs, cluster, service) => {
  const { services } = await ecs
    .describeServices({ cluster, services: [service] })
    .promise()
  return services[0]
}

/**
 * @param {Service} service -
 * @param {Date} [since] -
 * @param {Date} [until] -
 * @returns {Map} -
 * @example
 * const warnings = await getWarnings(service)
 */
const getWarnings = (service, since = null, until = null) => {
  since = since || deploymentCreatedAt(service.deployments)
  until = until || new Date()
  return service.events.reduce((errors, event) => {
    if (since < event.createdAt && event.createdAt < until) {
      errors.set(event.createdAt, event.message)
    }
    return errors
  }, new Map())
}

/**
 * @param {Deployments} deployments -
 * @returns {Date} -
 * @example
 * const createdAt = await deploymentCreatedAt(service)
 */
const deploymentCreatedAt = deployments => {
  return deployments.reduce((createdAt, deployment) => {
    if (deployment.status === 'PRIMARY') {
      createdAt = deployment.createdAt
    }
    return createdAt
  }, new Date())
}

/**
 * @param {Deployments} deployments -
 * @returns {Date} -
 * @example
 * const updatedAt = await deploymentUpdatedAt(service)
 */
const deploymentUpdatedAt = deployments => {
  return deployments.reduce((updatedAt, deployment) => {
    if (deployment.status === 'PRIMARY') {
      updatedAt = deployment.updatedAt
    }
    return updatedAt
  }, new Date())
}

/**
 * @param {Service} service -
 * @param {string} failureMessage -
 * @param {boolean} ignoreWarnings -
 * @param {Date} since -
 * @param {boolean} timeout -
 * @param {Context} ctx -
 * @returns {Date} -
 * @example
 * const inspectedUntil = inspectErrors(service, failureMessage, ignoreWarnings, since, timeout, ctx)
 */
const inspectErrors = (
  service,
  failureMessage,
  ignoreWarnings,
  since,
  timeout,
  ctx
) => {
  let error = false
  let lastErrorTimestamp = since

  const warnings = getWarnings(service, since)
  warnings.forEach((message, timestamp) => {
    if (ignoreWarnings) {
      lastErrorTimestamp = timestamp
      ctx.logger.log(`[${timestamp}] WARNING: ${message}`)
      ctx.logger.log('Continuing.')
    } else {
      ctx.logger.log(`[${timestamp}] ERROR: ${message}\n`)
      error = true
    }
  })

  const olderErrors = getWarnings(
    service,
    deploymentCreatedAt(service.deployments),
    deploymentUpdatedAt(service.deployments)
  )
  if (olderErrors.size > 0) {
    ctx.logger.log('Older errors')
    olderErrors.forEach((message, timestamp) => {
      ctx.logger.log(`[${timestamp}] ${message}`)
    })
  }

  if (timeout) {
    error = true
    failureMessage +=
      ' due to timeout. Please see: \nhttps://github.com/fabfuel/ecs-deploy#timeout'
  }

  if (error) {
    throw new Error(failureMessage)
  }

  return lastErrorTimestamp
}

/**
 * @param {number} seconds -
 * @returns {Promise<void>} -
 * @example
 * await sleep(5)
 */
const sleep = seconds =>
  new Promise(resolve => {
    setTimeout(() => resolve(), seconds * 1000)
  })

/**
 * @param {ECS} ecs -
 * @param {string} cluster -
 * @param {string} serviceName -
 * @param {number} timeout -
 * @param {boolean} ignoreWarnings -
 * @param {Context} ctx -
 * @returns {Promise<void>} -
 * @example
 * const service = await waitForFinish(ecs, 'myCluster', 'myService', timeout, ignoreWarnings, ctx)
 */
const waitForFinish = async (
  ecs,
  cluster,
  serviceName,
  timeout,
  ignoreWarnings,
  ctx
) => {
  ctx.logger.log('Deploying new task definition')
  const failureMessage = 'Deployment failed'
  const waitingTimeout = new Date()
  waitingTimeout.setSeconds(timeout)
  const service = await getService(ecs, cluster, serviceName)
  let inspectedUntil = null

  let waiting = timeout !== -1

  while (waiting && new Date() < waitingTimeout) {
    inspectedUntil = inspectErrors(
      service,
      failureMessage,
      ignoreWarnings,
      inspectedUntil,
      false,
      ctx
    )
    waiting = !(await isDeployed(ecs, service, cluster))

    if (waiting) {
      await sleep(1)
    }
  }

  inspectErrors(
    service,
    failureMessage,
    ignoreWarnings,
    inspectedUntil,
    waiting,
    ctx
  )

  ctx.logger.log('Deployment successful')
}

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
    const service = await getService(
      ecs,
      pluginConfig.cluster,
      pluginConfig.service
    )
    const { taskDefinition } = await ecs
      .describeTaskDefinition({
        taskDefinition: service.taskDefinition
      })
      .promise()
    ctx.logger.log(
      `Deploying based on task definition: ${taskDefinition.family}`
    )
    /** @type {import('aws-sdk').ECS.ContainerDefinitions} */
    const containerDefinitions = taskDefinition.containerDefinitions.map(
      containerDefinition => {
        const imageDefinition = containerDefinition.image.split(':')
        const image = `${imageDefinition[0]}:${ctx.nextRelease.version.trim()}`
        ctx.logger.log(
          `Changed ${image} of container "${containerDefinition.name}" to: "${image}" (was: "${containerDefinition.image}")`
        )
        return {
          ...containerDefinition,
          image
        }
      }
    )
    ctx.logger.log('Creating new task definition revision')
    const { taskDefinition: newTaskDefinition } = await ecs
      .registerTaskDefinition({
        family: taskDefinition.family,
        taskRoleArn: taskDefinition.taskRoleArn,
        executionRoleArn: taskDefinition.executionRoleArn,
        networkMode: taskDefinition.networkMode,
        containerDefinitions: containerDefinitions,
        volumes: taskDefinition.volumes,
        placementConstraints: taskDefinition.placementConstraints,
        requiresCompatibilities: taskDefinition.requiresCompatibilities,
        cpu: taskDefinition.cpu,
        memory: taskDefinition.memory,
        pidMode: taskDefinition.pidMode,
        ipcMode: taskDefinition.ipcMode,
        inferenceAccelerators: taskDefinition.inferenceAccelerators
      })
      .promise()
    ctx.logger.log(
      `Successfully created revision: ${newTaskDefinition.revision}`
    )
    ctx.logger.log('Updating service')
    await ecs
      .updateService({
        cluster: pluginConfig.cluster,
        service: pluginConfig.service,
        taskDefinition: newTaskDefinition.taskDefinitionArn
      })
      .promise()
    ctx.logger.log(
      `Successfully changed task definition to: ${newTaskDefinition.family}:${newTaskDefinition.revision}`
    )
    ctx.logger.log('Deploying new task definition')
    const timeout = pluginConfig.timeout || 300
    const ignoreWarnings = pluginConfig.ignoreWarnings || false
    await waitForFinish(
      ecs,
      pluginConfig.cluster,
      pluginConfig.service,
      timeout,
      ignoreWarnings,
      ctx
    )
  } catch (err) {
    throw new AggregateError([getError('EDEPLOY', ctx)])
  }
}
