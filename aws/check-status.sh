#!/bin/bash

# Recipe Sharing Platform - Status Check Script
# This script checks the status of your AWS deployment

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

echo -e "${BLUE}📊 Recipe Sharing Platform - Status Check${NC}"
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

# Check if stack exists
if ! aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &> /dev/null; then
    echo -e "${RED}❌ CloudFormation stack '$STACK_NAME' not found.${NC}"
    echo -e "${YELLOW}💡 Run './aws/deploy.sh' to deploy the application.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CloudFormation stack exists${NC}"

# Get stack status
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].StackStatus' \
    --output text)

echo -e "${BLUE}📋 Stack Status:${NC} $STACK_STATUS"

if [ "$STACK_STATUS" != "CREATE_COMPLETE" ] && [ "$STACK_STATUS" != "UPDATE_COMPLETE" ]; then
    echo -e "${YELLOW}⚠️  Stack is not in a stable state${NC}"
    echo -e "${BLUE}💡 Check CloudFormation events in AWS Console${NC}"
fi

# Get stack outputs
echo -e "${BLUE}📋 Stack Outputs:${NC}"
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# Check ECS cluster
echo -e "${BLUE}📋 ECS Cluster Status:${NC}"
CLUSTER_STATUS=$(aws ecs describe-clusters \
    --clusters $STACK_NAME-cluster \
    --region $REGION \
    --query 'clusters[0].status' \
    --output text)

echo -e "${BLUE}   Cluster Status:${NC} $CLUSTER_STATUS"

# Check ECS service
echo -e "${BLUE}📋 ECS Service Status:${NC}"
SERVICE_STATUS=$(aws ecs describe-services \
    --cluster $STACK_NAME-cluster \
    --services $STACK_NAME-service \
    --region $REGION \
    --query 'services[0].status' \
    --output text)

RUNNING_COUNT=$(aws ecs describe-services \
    --cluster $STACK_NAME-cluster \
    --services $STACK_NAME-service \
    --region $REGION \
    --query 'services[0].runningCount' \
    --output text)

DESIRED_COUNT=$(aws ecs describe-services \
    --cluster $STACK_NAME-cluster \
    --services $STACK_NAME-service \
    --region $REGION \
    --query 'services[0].desiredCount' \
    --output text)

echo -e "${BLUE}   Service Status:${NC} $SERVICE_STATUS"
echo -e "${BLUE}   Running Tasks:${NC} $RUNNING_COUNT/$DESIRED_COUNT"

if [ "$RUNNING_COUNT" -eq "$DESIRED_COUNT" ] && [ "$RUNNING_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Service is running properly${NC}"
else
    echo -e "${YELLOW}⚠️  Service is not running properly${NC}"
    echo -e "${BLUE}💡 Check ECS service events in AWS Console${NC}"
fi

# Check ECS tasks
echo -e "${BLUE}📋 ECS Tasks:${NC}"
TASKS=$(aws ecs list-tasks \
    --cluster $STACK_NAME-cluster \
    --region $REGION \
    --query 'taskArns' \
    --output text)

if [ -n "$TASKS" ]; then
    for task in $TASKS; do
        TASK_STATUS=$(aws ecs describe-tasks \
            --cluster $STACK_NAME-cluster \
            --tasks $task \
            --region $REGION \
            --query 'tasks[0].lastStatus' \
            --output text)
        
        HEALTH_STATUS=$(aws ecs describe-tasks \
            --cluster $STACK_NAME-cluster \
            --tasks $task \
            --region $REGION \
            --query 'tasks[0].healthStatus' \
            --output text)
        
        echo -e "${BLUE}   Task:${NC} $(basename $task)"
        echo -e "${BLUE}   Status:${NC} $TASK_STATUS"
        echo -e "${BLUE}   Health:${NC} $HEALTH_STATUS"
        echo ""
    done
else
    echo -e "${YELLOW}⚠️  No tasks found${NC}"
fi

# Test application endpoints
echo -e "${BLUE}📋 Application Health Check:${NC}"
ALB_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
    --output text)

if [ -n "$ALB_URL" ]; then
    echo -e "${BLUE}   Application URL:${NC} $ALB_URL"
    echo -e "${BLUE}   GraphQL Playground:${NC} $ALB_URL/graphql"
    echo -e "${BLUE}   Health Check:${NC} $ALB_URL/api/health"
    
    # Test health endpoint
    echo -e "${BLUE}   Testing health endpoint...${NC}"
    if curl -s -f "$ALB_URL/api/health" > /dev/null; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed${NC}"
        echo -e "${BLUE}💡 The application might still be starting up${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not retrieve application URL${NC}"
fi

# Check CloudWatch Logs
echo -e "${BLUE}📋 CloudWatch Logs:${NC}"
LOG_GROUP="/aws/ecs/$STACK_NAME"

if aws logs describe-log-groups --log-group-name-prefix $LOG_GROUP --region $REGION &> /dev/null; then
    echo -e "${GREEN}✅ Log group exists: $LOG_GROUP${NC}"
    
    # Get recent log streams
    LOG_STREAMS=$(aws logs describe-log-streams \
        --log-group-name $LOG_GROUP \
        --region $REGION \
        --order-by LastEventTime \
        --descending \
        --max-items 5 \
        --query 'logStreams[*].logStreamName' \
        --output text)
    
    if [ -n "$LOG_STREAMS" ]; then
        echo -e "${BLUE}   Recent log streams:${NC}"
        for stream in $LOG_STREAMS; do
            echo -e "${BLUE}     - $stream${NC}"
        done
    fi
else
    echo -e "${YELLOW}⚠️  Log group not found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Status Check Complete!${NC}"
echo "================================================"

# Summary
if [ "$STACK_STATUS" = "CREATE_COMPLETE" ] || [ "$STACK_STATUS" = "UPDATE_COMPLETE" ]; then
    if [ "$RUNNING_COUNT" -eq "$DESIRED_COUNT" ] && [ "$RUNNING_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Application is running successfully!${NC}"
        echo -e "${BLUE}💡 Access your application at: $ALB_URL${NC}"
    else
        echo -e "${YELLOW}⚠️  Application is deployed but not running properly${NC}"
        echo -e "${BLUE}💡 Check ECS service events and logs${NC}"
    fi
else
    echo -e "${RED}❌ Application deployment has issues${NC}"
    echo -e "${BLUE}💡 Check CloudFormation events in AWS Console${NC}"
fi

echo ""
echo -e "${YELLOW}💡 Useful Commands:${NC}"
echo "   View logs: aws logs tail $LOG_GROUP --follow --region $REGION"
echo "   Update env: ./aws/update-env.sh"
echo "   Cleanup: ./aws/cleanup.sh"
