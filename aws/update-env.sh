#!/bin/bash

# Recipe Sharing Platform - Environment Variables Update Script
# This script updates environment variables in the ECS task definition

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

echo -e "${BLUE}🔧 Recipe Sharing Platform - Environment Update${NC}"
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

echo -e "${YELLOW}📝 Available environment variables to update:${NC}"
echo "1. OPENAI_API_KEY"
echo "2. JWT_SECRET"
echo "3. DATABASE_PASSWORD"
echo "4. Custom environment variable"
echo ""

read -p "Enter the number of the variable you want to update (1-4): " choice

case $choice in
    1)
        read -p "Enter your OpenAI API key: " OPENAI_API_KEY
        if [ -z "$OPENAI_API_KEY" ]; then
            echo -e "${RED}❌ OpenAI API key cannot be empty${NC}"
            exit 1
        fi
        ENV_NAME="OPENAI_API_KEY"
        ENV_VALUE="$OPENAI_API_KEY"
        ;;
    2)
        read -p "Enter your JWT secret (or press Enter for random): " JWT_SECRET
        if [ -z "$JWT_SECRET" ]; then
            JWT_SECRET=$(openssl rand -base64 32)
            echo -e "${BLUE}Generated JWT secret: $JWT_SECRET${NC}"
        fi
        ENV_NAME="JWT_SECRET"
        ENV_VALUE="$JWT_SECRET"
        ;;
    3)
        read -p "Enter your database password (or press Enter for random): " DB_PASSWORD
        if [ -z "$DB_PASSWORD" ]; then
            DB_PASSWORD=$(openssl rand -base64 16)
            echo -e "${BLUE}Generated database password: $DB_PASSWORD${NC}"
        fi
        ENV_NAME="DATABASE_PASSWORD"
        ENV_VALUE="$DB_PASSWORD"
        ;;
    4)
        read -p "Enter environment variable name: " ENV_NAME
        read -p "Enter environment variable value: " ENV_VALUE
        if [ -z "$ENV_NAME" ] || [ -z "$ENV_VALUE" ]; then
            echo -e "${RED}❌ Both name and value are required${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "${YELLOW}🔄 Updating environment variable: $ENV_NAME${NC}"

# Get current task definition
TASK_DEFINITION=$(aws ecs describe-task-definition \
    --task-definition $STACK_NAME-task \
    --region $REGION \
    --query 'taskDefinition')

# Update environment variable in task definition
UPDATED_TASK_DEFINITION=$(echo $TASK_DEFINITION | jq --arg name "$ENV_NAME" --arg value "$ENV_VALUE" '
    .containerDefinitions[4].environment |= map(
        if .name == $name then .value = $value else . end
    ) |
    .containerDefinitions[4].environment |= if map(.name == $name) | any then . else . + [{"name": $name, "value": $value}] end |
    del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)
')

# Register new task definition
NEW_TASK_DEFINITION=$(echo $UPDATED_TASK_DEFINITION | aws ecs register-task-definition \
    --cli-input-json file:///dev/stdin \
    --region $REGION \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo -e "${GREEN}✅ New task definition registered: $NEW_TASK_DEFINITION${NC}"

# Update ECS service
echo -e "${YELLOW}🔄 Updating ECS service...${NC}"
aws ecs update-service \
    --cluster $STACK_NAME-cluster \
    --service $STACK_NAME-service \
    --task-definition $NEW_TASK_DEFINITION \
    --region $REGION \
    --query 'service.serviceName' \
    --output text

echo -e "${GREEN}✅ ECS service updated${NC}"

# Wait for service to be stable
echo -e "${YELLOW}⏳ Waiting for service to stabilize...${NC}"
aws ecs wait services-stable \
    --cluster $STACK_NAME-cluster \
    --services $STACK_NAME-service \
    --region $REGION

echo -e "${GREEN}✅ Environment variable updated successfully!${NC}"

# Get application URL
ALB_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
    --output text)

echo ""
echo -e "${GREEN}🎉 Update Complete!${NC}"
echo "================================================"
echo -e "${BLUE}📱 Application URL:${NC} $ALB_URL"
echo -e "${BLUE}🔍 GraphQL Playground:${NC} $ALB_URL/graphql"
echo -e "${BLUE}❤️  Health Check:${NC} $ALB_URL/api/health"
echo ""
echo -e "${YELLOW}💡 Note:${NC}"
echo "   - The application will restart with the new environment variable"
echo "   - Wait 2-3 minutes for the update to complete"
echo "   - Check the health endpoint to verify the application is running"
