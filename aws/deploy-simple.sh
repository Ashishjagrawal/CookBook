#!/bin/bash

# Recipe Sharing Platform - Simple AWS Deployment Script
# This script deploys the application to AWS using ECS Fargate with a single container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="recipe-platform"
REGION="ap-south-1"
TEMPLATE_FILE="aws/cloudformation-simple.yaml"

echo -e "${BLUE}🚀 Recipe Sharing Platform - Simple AWS Deployment${NC}"
echo "================================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}🔍 Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity --profile iam-user &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure --profile iam-user' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS credentials configured${NC}"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --profile iam-user --query Account --output text)
echo -e "${BLUE}📋 AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"

# Set ECR repository URI
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/recipe-sharing-platform-repo"

echo -e "${YELLOW}🏗️  Step 1: Deploy CloudFormation Stack...${NC}"

# Deploy CloudFormation stack
aws cloudformation deploy \
    --template-file $TEMPLATE_FILE \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile iam-user \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides \
        Environment=dev \
        DatabasePassword="RecipePassword123!" \
        JWTSecret="your-super-secret-jwt-key-change-this-in-production" \
    --no-fail-on-empty-changeset

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ CloudFormation deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CloudFormation stack deployed successfully${NC}"

echo -e "${YELLOW}🐳 Step 2: Build and push Docker image...${NC}"

# Login to ECR
echo -e "${BLUE}🔐 Logging in to Amazon ECR...${NC}"
aws ecr get-login-password --region $REGION --profile iam-user | docker login --username AWS --password-stdin $ECR_URI

# Build Docker image
echo -e "${BLUE}🔨 Building Docker image...${NC}"
docker build -t $STACK_NAME:latest .

# Tag image for ECR
docker tag $STACK_NAME:latest $ECR_URI:latest

# Push image to ECR
echo -e "${BLUE}📤 Pushing image to ECR...${NC}"
docker push $ECR_URI:latest

echo -e "${GREEN}✅ Docker image pushed successfully${NC}"

echo -e "${YELLOW}🔄 Step 3: Update ECS Service...${NC}"

# Force new deployment
aws ecs update-service \
    --cluster $STACK_NAME-cluster \
    --service $STACK_NAME-service \
    --force-new-deployment \
    --region $REGION \
    --profile iam-user

echo -e "${GREEN}✅ ECS service updated${NC}"

echo -e "${YELLOW}⏳ Step 4: Waiting for deployment to complete...${NC}"

# Wait for service to be stable
aws ecs wait services-stable \
    --cluster $STACK_NAME-cluster \
    --services $STACK_NAME-service \
    --region $REGION \
    --profile iam-user

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

# Get stack outputs
echo -e "${YELLOW}📋 Getting deployment information...${NC}"

ALB_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile iam-user \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
    --output text)

GRAPHQL_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile iam-user \
    --query 'Stacks[0].Outputs[?OutputKey==`GraphQLPlaygroundURL`].OutputValue' \
    --output text)

HEALTH_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile iam-user \
    --query 'Stacks[0].Outputs[?OutputKey==`HealthCheckURL`].OutputValue' \
    --output text)

echo ""
echo -e "${GREEN}🎉 Deployment Successful!${NC}"
echo "================================================"
echo -e "${BLUE}📱 Application URL:${NC} $ALB_URL"
echo -e "${BLUE}🔍 GraphQL Playground:${NC} $GRAPHQL_URL"
echo -e "${BLUE}❤️  Health Check:${NC} $HEALTH_URL"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Wait 2-3 minutes for the container to start"
echo "2. Test the health check: curl $HEALTH_URL"
echo "3. Access GraphQL Playground: $GRAPHQL_URL"
echo "4. Update your OpenAI API key in the ECS task definition"
echo ""
echo -e "${BLUE}💡 To view logs:${NC}"
echo "aws logs tail /aws/ecs/$STACK_NAME --follow --region $REGION --profile iam-user"
echo ""
echo -e "${BLUE}💡 To delete the stack:${NC}"
echo "aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION --profile iam-user"
