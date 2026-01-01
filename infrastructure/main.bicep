// erold.guide Infrastructure
// Azure Blob Storage with Static Website Hosting

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environmentName string = 'prod'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Custom domain for the website (optional)')
param customDomain string = ''

// Naming
var resourceToken = uniqueString(resourceGroup().id)
var prefix = 'eroldguide-${environmentName}'
var storageAccountName = replace('${prefix}${resourceToken}', '-', '')

// Storage Account with Static Website Hosting
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: take(storageAccountName, 24) // Storage account names max 24 chars
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS' // Locally redundant - cost effective for static content
  }
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true // Required for static website
    allowSharedKeyAccess: true
    publicNetworkAccess: 'Enabled' // Required for public website

    // Static website hosting
    staticWebsite: {
      enabled: true
      indexDocument: 'index.html'
      errorDocument404Path: '404.html'
    }

    // Blob service properties
    blobServices: {
      cors: {
        corsRules: [
          {
            allowedOrigins: ['*'] // Allow all origins for API access
            allowedMethods: ['GET', 'HEAD', 'OPTIONS']
            allowedHeaders: ['*']
            exposedHeaders: ['*']
            maxAgeInSeconds: 86400
          }
        ]
      }
      deleteRetentionPolicy: {
        enabled: true
        days: 7
      }
    }
  }

  tags: {
    environment: environmentName
    project: 'erold.guide'
    'cost-center': 'platform'
  }
}

// Blob Service
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'HEAD', 'OPTIONS']
          allowedHeaders: ['*']
          exposedHeaders: ['*']
          maxAgeInSeconds: 86400
        }
      ]
    }
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

// Container for raw markdown files
resource rawContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'raw'
  properties: {
    publicAccess: 'Blob' // Individual blobs are publicly accessible
  }
}

// CDN Profile (optional, for custom domain and caching)
resource cdnProfile 'Microsoft.Cdn/profiles@2024-02-01' = if (customDomain != '') {
  name: '${prefix}-cdn'
  location: 'global'
  sku: {
    name: 'Standard_Microsoft'
  }
  tags: {
    environment: environmentName
    project: 'erold.guide'
  }
}

// CDN Endpoint
resource cdnEndpoint 'Microsoft.Cdn/profiles/endpoints@2024-02-01' = if (customDomain != '') {
  parent: cdnProfile
  name: '${prefix}-endpoint'
  location: 'global'
  properties: {
    originHostHeader: replace(replace(storageAccount.properties.primaryEndpoints.web, 'https://', ''), '/', '')
    origins: [
      {
        name: 'storage-origin'
        properties: {
          hostName: replace(replace(storageAccount.properties.primaryEndpoints.web, 'https://', ''), '/', '')
          httpPort: 80
          httpsPort: 443
          priority: 1
          weight: 1000
          enabled: true
        }
      }
    ]
    isHttpAllowed: false
    isHttpsAllowed: true
    queryStringCachingBehavior: 'IgnoreQueryString'
    optimizationType: 'GeneralWebDelivery'
    deliveryPolicy: {
      rules: [
        {
          name: 'CacheJsonFiles'
          order: 1
          conditions: [
            {
              name: 'UrlFileExtension'
              parameters: {
                typeName: 'DeliveryRuleUrlFileExtensionMatchConditionParameters'
                operator: 'Equal'
                matchValues: ['json']
              }
            }
          ]
          actions: [
            {
              name: 'CacheExpiration'
              parameters: {
                typeName: 'DeliveryRuleCacheExpirationActionParameters'
                cacheBehavior: 'SetIfMissing'
                cacheType: 'All'
                cacheDuration: '01:00:00' // 1 hour cache for JSON
              }
            }
          ]
        }
        {
          name: 'CacheHtmlFiles'
          order: 2
          conditions: [
            {
              name: 'UrlFileExtension'
              parameters: {
                typeName: 'DeliveryRuleUrlFileExtensionMatchConditionParameters'
                operator: 'Equal'
                matchValues: ['html']
              }
            }
          ]
          actions: [
            {
              name: 'CacheExpiration'
              parameters: {
                typeName: 'DeliveryRuleCacheExpirationActionParameters'
                cacheBehavior: 'SetIfMissing'
                cacheType: 'All'
                cacheDuration: '00:05:00' // 5 minute cache for HTML
              }
            }
          ]
        }
      ]
    }
  }
}

// Outputs
@description('Storage account name')
output storageAccountName string = storageAccount.name

@description('Static website URL')
output websiteUrl string = storageAccount.properties.primaryEndpoints.web

@description('Blob endpoint for API files')
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob

@description('Raw content container URL')
output rawContentUrl string = '${storageAccount.properties.primaryEndpoints.blob}raw'

@description('CDN endpoint URL (if custom domain configured)')
output cdnEndpointUrl string = customDomain != '' ? 'https://${cdnEndpoint.properties.hostName}' : ''

@description('Connection string for deployments')
output connectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
