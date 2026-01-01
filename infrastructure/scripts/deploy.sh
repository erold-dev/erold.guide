#!/bin/bash
set -euo pipefail

# erold.guide Infrastructure Deployment Script
# Usage: ./deploy.sh [environment] [resource-group]

ENVIRONMENT="${1:-prod}"
RESOURCE_GROUP="${2:-rg-erold-guide-${ENVIRONMENT}}"
LOCATION="${3:-eastus2}"

echo "=========================================="
echo "erold.guide Infrastructure Deployment"
echo "=========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Resource Group: ${RESOURCE_GROUP}"
echo "Location: ${LOCATION}"
echo ""

# Check if logged in to Azure
if ! az account show &>/dev/null; then
    echo "Error: Not logged in to Azure. Run 'az login' first."
    exit 1
fi

# Create resource group if it doesn't exist
echo "Ensuring resource group exists..."
az group create \
    --name "${RESOURCE_GROUP}" \
    --location "${LOCATION}" \
    --output none

# Validate the Bicep template
echo "Validating Bicep template..."
az deployment group validate \
    --resource-group "${RESOURCE_GROUP}" \
    --template-file "$(dirname "$0")/../main.bicep" \
    --parameters "$(dirname "$0")/../parameters/${ENVIRONMENT}.bicepparam" \
    --output none

# Deploy the infrastructure
echo "Deploying infrastructure..."
DEPLOYMENT_OUTPUT=$(az deployment group create \
    --resource-group "${RESOURCE_GROUP}" \
    --template-file "$(dirname "$0")/../main.bicep" \
    --parameters "$(dirname "$0")/../parameters/${ENVIRONMENT}.bicepparam" \
    --query properties.outputs \
    --output json)

# Extract outputs
STORAGE_ACCOUNT=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.storageAccountName.value')
WEBSITE_URL=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.websiteUrl.value')
BLOB_ENDPOINT=$(echo "${DEPLOYMENT_OUTPUT}" | jq -r '.blobEndpoint.value')

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Storage Account: ${STORAGE_ACCOUNT}"
echo "Website URL: ${WEBSITE_URL}"
echo "Blob Endpoint: ${BLOB_ENDPOINT}"
echo ""
echo "To upload the site, run:"
echo "  az storage blob upload-batch \\"
echo "    --account-name ${STORAGE_ACCOUNT} \\"
echo "    --destination '\$web' \\"
echo "    --source ./dist"
