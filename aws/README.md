# 🚀 AWS Deployment Guide

This guide will help you deploy the Recipe Sharing Platform to AWS using ECS Fargate with minimal infrastructure.

## 📋 Prerequisites

1. **AWS Account** - You mentioned you have this ✅
2. **AWS CLI** - Install and configure
3. **Docker** - For building the container image
4. **jq** - For JSON processing (optional but recommended)

## 🛠️ Quick Setup

### 1. Install AWS CLI (if not already installed)

```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
# Download from: https://aws.amazon.com/cli/
```

### 2. Configure AWS CLI

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`)
- Default output format (e.g., `json`)

### 3. Install jq (optional but recommended)

```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq

# Windows
# Download from: https://stedolan.github.io/jq/
```

## 🚀 Deployment

### One-Command Deployment

```bash
./aws/deploy.sh
```

This script will:
1. ✅ Check prerequisites
2. ✅ Deploy CloudFormation stack
3. ✅ Build and push Docker image
4. ✅ Update ECS service
5. ✅ Wait for deployment completion
6. ✅ Display access URLs

### Manual Deployment (if needed)

```bash
# 1. Deploy infrastructure
aws cloudformation deploy \
    --template-file aws/cloudformation-template.yaml \
    --stack-name recipe-sharing-platform \
    --region us-east-1 \
    --capabilities CAPABILITY_IAM

# 2. Build and push image
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/recipe-sharing-platform-repo"

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI
docker build -t recipe-sharing-platform:latest .
docker tag recipe-sharing-platform:latest $ECR_URI:latest
docker push $ECR_URI:latest

# 3. Update service
aws ecs update-service \
    --cluster recipe-sharing-platform-cluster \
    --service recipe-sharing-platform-service \
    --force-new-deployment \
    --region us-east-1
```

## 🌐 Access Your Application

After deployment, you'll get URLs like:

- **Application**: `http://recipe-sharing-platform-alb-1234567890.us-east-1.elb.amazonaws.com`
- **GraphQL Playground**: `http://recipe-sharing-platform-alb-1234567890.us-east-1.elb.amazonaws.com/graphql`
- **Health Check**: `http://recipe-sharing-platform-alb-1234567890.us-east-1.elb.amazonaws.com/api/health`

## 🔧 Configuration

### Environment Variables

The application uses these environment variables (set in CloudFormation):

```yaml
NODE_ENV: production
PORT: 4323
DATABASE_URL: postgresql://recipe_user:RecipePassword123!@localhost:5432/recipe_platform?schema=public
ELASTICSEARCH_NODE: http://localhost:9200
KAFKA_BROKER: localhost:9092
JWT_SECRET: your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN: 7d
OPENAI_API_KEY: your-openai-api-key-here
```

### Update OpenAI API Key

To update the OpenAI API key:

```bash
# Update the ECS task definition
aws ecs update-service \
    --cluster recipe-sharing-platform-cluster \
    --service recipe-sharing-platform-service \
    --task-definition recipe-sharing-platform-task \
    --region us-east-1
```

## 📊 Monitoring

### View Logs

```bash
# View all logs
aws logs tail /aws/ecs/recipe-sharing-platform --follow --region us-east-1

# View specific container logs
aws logs tail /aws/ecs/recipe-sharing-platform --follow --filter-pattern "app" --region us-east-1
```

### Check Service Status

```bash
# Check ECS service status
aws ecs describe-services \
    --cluster recipe-sharing-platform-cluster \
    --services recipe-sharing-platform-service \
    --region us-east-1

# Check task status
aws ecs list-tasks \
    --cluster recipe-sharing-platform-cluster \
    --region us-east-1
```

## 🗑️ Cleanup

To remove all AWS resources and stop billing:

```bash
./aws/cleanup.sh
```

Or manually:

```bash
aws cloudformation delete-stack \
    --stack-name recipe-sharing-platform \
    --region us-east-1
```

## 💰 Cost Estimation

### Free Tier (First 12 months)
- **ECS Fargate**: 750 hours/month free
- **Application Load Balancer**: 750 hours/month free
- **CloudWatch Logs**: 5GB/month free
- **ECR**: 500MB/month free

### After Free Tier
- **Small deployment**: ~$20-40/month
- **Medium deployment**: ~$50-100/month

## 🏗️ Architecture

```
Internet
    ↓
Application Load Balancer
    ↓
ECS Fargate Task (All containers in one task)
    ├── NestJS App (Port 4323)
    ├── PostgreSQL (Port 5432)
    ├── Elasticsearch (Port 9200)
    ├── Kafka (Port 9092)
    └── Zookeeper (Port 2181)
```

## 🔍 Troubleshooting

### Common Issues

1. **Deployment fails**
   - Check AWS credentials: `aws sts get-caller-identity`
   - Check region: `aws configure get region`
   - Check CloudFormation events in AWS Console

2. **Application not accessible**
   - Wait 5-10 minutes for all containers to start
   - Check health check: `curl http://your-alb-url/api/health`
   - Check ECS service logs

3. **Database connection issues**
   - Check if PostgreSQL container is running
   - Check database logs: `aws logs tail /aws/ecs/recipe-sharing-platform --filter-pattern "postgres"`

4. **Elasticsearch issues**
   - Check if Elasticsearch container is running
   - Check Elasticsearch logs: `aws logs tail /aws/ecs/recipe-sharing-platform --filter-pattern "elasticsearch"`

### Useful Commands

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name recipe-sharing-platform --region us-east-1

# Get stack outputs
aws cloudformation describe-stacks --stack-name recipe-sharing-platform --region us-east-1 --query 'Stacks[0].Outputs'

# Check ECS cluster
aws ecs describe-clusters --clusters recipe-sharing-platform-cluster --region us-east-1

# Check ECS tasks
aws ecs list-tasks --cluster recipe-sharing-platform-cluster --region us-east-1
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review AWS CloudFormation events in the AWS Console
3. Check ECS service logs
4. Verify all containers are running and healthy

## 🎯 Next Steps

After successful deployment:

1. **Test the application** using the provided URLs
2. **Update environment variables** as needed
3. **Set up monitoring** and alerts
4. **Configure custom domain** (optional)
5. **Set up CI/CD pipeline** (optional)

---

**Happy Deploying! 🚀**
