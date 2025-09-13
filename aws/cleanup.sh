#!/bin/bash

# Recipe Sharing Platform - AWS Cleanup Script
# This script removes all AWS resources created for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="recipe-sharing-platform"
REGION="us-east-1"

echo -e "${RED}🗑️  Recipe Sharing Platform - AWS Cleanup${NC}"
echo "================================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured.${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  This will delete ALL resources for the Recipe Sharing Platform!${NC}"
echo -e "${YELLOW}   This includes:${NC}"
echo "   - ECS Cluster and Services"
echo "   - Application Load Balancer"
echo "   - VPC and Networking"
echo "   - CloudWatch Logs"
echo "   - ECR Repository"
echo "   - All data will be lost!"
echo ""

read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${BLUE}❌ Cleanup cancelled${NC}"
    exit 0
fi

echo -e "${YELLOW}🔄 Starting cleanup...${NC}"

# Delete CloudFormation stack
echo -e "${BLUE}🗑️  Deleting CloudFormation stack...${NC}"
aws cloudformation delete-stack \
    --stack-name $STACK_NAME \
    --region $REGION

# Wait for stack deletion
echo -e "${BLUE}⏳ Waiting for stack deletion to complete...${NC}"
aws cloudformation wait stack-delete-complete \
    --stack-name $STACK_NAME \
    --region $REGION

echo -e "${GREEN}✅ CloudFormation stack deleted successfully${NC}"

# Delete ECR repository (if it exists)
echo -e "${BLUE}🗑️  Deleting ECR repository...${NC}"
ECR_REPO="${STACK_NAME}-repo"

# Check if repository exists
if aws ecr describe-repositories --repository-names $ECR_REPO --region $REGION &> /dev/null; then
    # Delete all images first
    aws ecr list-images --repository-name $ECR_REPO --region $REGION --query 'imageIds[*]' --output json | \
    jq -r '.[] | .imageDigest' | \
    xargs -I {} aws ecr batch-delete-image --repository-name $ECR_REPO --image-ids imageDigest={} --region $REGION 2>/dev/null || true
    
    # Delete repository
    aws ecr delete-repository --repository-name $ECR_REPO --region $REGION --force
    echo -e "${GREEN}✅ ECR repository deleted successfully${NC}"
else
    echo -e "${BLUE}ℹ️  ECR repository not found (already deleted)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Cleanup completed successfully!${NC}"
echo "================================================"
echo -e "${BLUE}✅ All AWS resources have been removed${NC}"
echo -e "${BLUE}✅ No charges will be incurred${NC}"
echo ""
echo -e "${YELLOW}💡 Note:${NC}"
echo "   - CloudWatch Logs may take a few minutes to be fully deleted"
echo "   - Check your AWS Console to verify all resources are removed"
