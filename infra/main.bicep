// ============================================================
// HuskyPark Predictor — Azure Infrastructure
// Deploys: Container Apps (API) + Static Web Apps (UI)
//          PostgreSQL Flexible Server + Cosmos DB (Mongo API)
//          Azure Cache for Redis + Key Vault + App Insights
// ============================================================

targetScope = 'resourceGroup'

@description('Deployment environment: dev or prod')
@allowed(['dev', 'prod'])
param environment string = 'dev'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('PostgreSQL admin login name')
param postgresAdminLogin string = 'huskypark_admin'

@secure()
@description('PostgreSQL admin password')
param postgresAdminPassword string

@secure()
@description('JWT secret key (min 32 chars)')
param jwtSecretKey string

@description('OpenAI API key for AI recommendations')
@secure()
param openAiApiKey string = ''

// ── Name helpers ──────────────────────────────────────────────

var prefix    = 'huskypark-${environment}'
var shortEnv  = environment == 'prod' ? 'p' : 'd'
var uniqueSuffix = uniqueString(resourceGroup().id)

// ── Log Analytics (required by Container Apps + App Insights) ─

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// ── Application Insights ──────────────────────────────────────

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-insights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ── Key Vault ─────────────────────────────────────────────────

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'hp${shortEnv}kv${uniqueSuffix}'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

resource kvSecretJwt 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'jwt-secret-key'
  properties: { value: jwtSecretKey }
}

resource kvSecretPgPass 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'postgres-password'
  properties: { value: postgresAdminPassword }
}

resource kvSecretOpenAi 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(openAiApiKey)) {
  parent: keyVault
  name: 'openai-api-key'
  properties: { value: openAiApiKey }
}

// ── PostgreSQL Flexible Server ────────────────────────────────

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: '${prefix}-pg-${uniqueSuffix}'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    version: '16'
    storage: { storageSizeGB: 32 }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: { mode: 'Disabled' }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgres
  name: 'huskypark_db'
  properties: { charset: 'utf8', collation: 'en_US.utf8' }
}

resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ── Cosmos DB (MongoDB API) ───────────────────────────────────

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' = {
  name: '${prefix}-cosmos-${uniqueSuffix}'
  location: location
  kind: 'MongoDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    apiProperties: { serverVersion: '7.0' }
    locations: [{ locationName: location, failoverPriority: 0 }]
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    enableFreeTier: environment == 'dev'
  }
}

resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases@2024-02-15-preview' = {
  parent: cosmosAccount
  name: 'huskypark_mongo'
  properties: { resource: { id: 'huskypark_mongo' } }
}

// ── Azure Cache for Redis ─────────────────────────────────────

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${prefix}-redis-${uniqueSuffix}'
  location: location
  properties: {
    sku: { name: 'Basic', family: 'C', capacity: 0 }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// ── Container Apps Environment ────────────────────────────────

resource containerEnv 'Microsoft.App/managedEnvironments@2023-11-02-preview' = {
  name: '${prefix}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ── Container Registry ────────────────────────────────────────

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'huskypark${uniqueSuffix}'
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

// ── Container App (FastAPI backend) ──────────────────────────

resource apiContainerApp 'Microsoft.App/containerApps@2023-11-02-preview' = {
  name: 'huskypark-api'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        transport: 'http'
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'acr-password',       value: acr.listCredentials().passwords[0].value }
        { name: 'pg-password',        value: postgresAdminPassword }
        { name: 'jwt-secret',         value: jwtSecretKey }
        { name: 'redis-key',          value: redis.listKeys().primaryKey }
        { name: 'cosmos-conn',        value: cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString }
        { name: 'appinsights-key',    value: appInsights.properties.InstrumentationKey }
      ]
    }
    template: {
      containers: [
        {
          name: 'huskypark-api'
          image: '${acr.properties.loginServer}/huskypark-api:latest'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'POSTGRES_HOST',     value: postgres.properties.fullyQualifiedDomainName }
            { name: 'POSTGRES_USER',     value: postgresAdminLogin }
            { name: 'POSTGRES_PASSWORD', secretRef: 'pg-password' }
            { name: 'POSTGRES_DB',       value: 'huskypark_db' }
            { name: 'POSTGRES_PORT',     value: '5432' }
            { name: 'MONGO_URL',         secretRef: 'cosmos-conn' }
            { name: 'MONGO_DB',          value: 'huskypark_mongo' }
            { name: 'REDIS_URL',         value: 'rediss://:${redis.listKeys().primaryKey}@${redis.properties.hostName}:6380/0' }
            { name: 'SECRET_KEY',        secretRef: 'jwt-secret' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', secretRef: 'appinsights-key' }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
  dependsOn: [postgres, cosmosAccount, redis]
}

// ── Static Web App (React frontend) ──────────────────────────

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: '${prefix}-web'
  location: 'eastus2'  // Static Web Apps availability differs by region
  sku: { name: 'Free', tier: 'Free' }
  properties: {
    repositoryUrl: 'https://github.com/OChidubem/HuskyPark'
    branch: 'main'
    buildProperties: {
      appLocation: 'frontend'
      outputLocation: 'dist'
    }
  }
}

// ── Outputs ───────────────────────────────────────────────────

output apiUrl string = 'https://${apiContainerApp.properties.configuration.ingress.fqdn}'
output frontendUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output acrLoginServer string = acr.properties.loginServer
