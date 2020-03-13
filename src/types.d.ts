import { Context as SemanticReleaseContext } from 'semantic-release'
import { Config as SemanticReleaseConfig } from 'semantic-release'

export interface Context extends SemanticReleaseContext {
  commits?: SemanticRelease.Commit[]
  message?: string
}

export interface Service {
  cluster: string
  service: string
  timeout?: number
  ignoreWarnings?: boolean
}

export interface Config extends SemanticReleaseConfig {
  services: Service[]
}
