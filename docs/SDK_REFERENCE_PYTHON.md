# Python SDK Reference

> **Official Architect Platform Python SDK** - Enterprise-grade Python client library with complete type hints, async/await support, and production-ready examples.

---

## 🚀 Quick Start

### Installation

```bash
# pip
pip install architect-platform-sdk

# poetry
poetry add architect-platform-sdk

# conda
conda install -c conda-forge architect-platform-sdk
```

### Basic Usage

```python
import asyncio
from architect_platform import ArchitectPlatform, ArchitectConfig

# Initialize with your API credentials
config = ArchitectConfig(
    api_key="sk_arch_live_1234567890abcdef",
    base_url="https://api.architect-platform.com",
    timeout=120.0,  # 2 minutes
    retry_attempts=3,
    enable_logging=True,
)

client = ArchitectPlatform(config)

async def main():
    # Generate your first blueprint
    blueprint = await client.blueprints.generate(
        input="Build an AI-powered SaaS platform for project management",
        project_name="ProjectAI"
    )

    print(f"Blueprint ID: {blueprint.id}")
    print(f"Status: {blueprint.status}")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 🔧 Configuration

### Core Options

```python
from architect_platform import ArchitectConfig, LogLevel
from typing import Optional, Dict, Any
import httpx

config = ArchitectConfig(
    # Required authentication
    api_key="sk_arch_live_1234567890abcdef",
    base_url="https://api.architect-platform.com",  # Optional

    # Performance tuning
    timeout=120.0,           # Default: 120.0 seconds
    retry_attempts=3,        # Default: 3
    retry_delay=1.0,         # Default: 1.0 seconds
    retry_max_delay=30.0,    # Default: 30.0 seconds
    retry_backoff_multiplier=2.0,  # Default: 2.0

    # Development options
    enable_logging=False,    # Default: False
    log_level=LogLevel.INFO,  # Default: INFO
    log_format="json",       # Options: "json", "text"

    # Enterprise features
    webhook_secret="webhook_secret_key",
    custom_headers={
        "X-Client-Version": "1.0.0",
        "X-Enterprise-ID": "acme-corp",
    },

    # Advanced HTTP client configuration
    http_client=httpx.AsyncClient(
        limits=httpx.Limits(max_keepalive_connections=20),
        timeout=httpx.Timeout(60.0, connect=10.0),
    ),
)

client = ArchitectPlatform(config)
```

### Environment Variables

```python
import os
from architect_platform import ArchitectConfig

# Load configuration from environment
config = ArchitectConfig.from_env(
    api_key_env="ARCHITECT_API_KEY",          # Default: ARCHITECT_API_KEY
    base_url_env="ARCHITECT_BASE_URL",      # Default: ARCHITECT_BASE_URL
    webhook_secret_env="ARCHITECT_WEBHOOK_SECRET",  # Default: ARCHITECT_WEBHOOK_SECRET
    timeout_env="ARCHITECT_TIMEOUT",         # Default: ARCHITECT_TIMEOUT
    enable_logging_env="ARCHITECT_LOGGING",  # Default: ARCHITECT_LOGGING
)

# Environment-specific configuration
if os.getenv("ENVIRONMENT") == "development":
    config.enable_logging = True
    config.log_level = LogLevel.DEBUG
    config.base_url = "http://localhost:3000/api"
elif os.getenv("ENVIRONMENT") == "production":
    config.enable_logging = False
    config.timeout = 180.0
    config.retry_attempts = 5
```

---

## 🔐 Authentication & Security

### API Key Authentication

```python
from architect_platform import ArchitectPlatform, ArchitectConfig, ArchitectAuthError
import asyncio

async def test_authentication():
    try:
        config = ArchitectConfig(api_key="sk_arch_live_1234567890abcdef")
        client = ArchitectPlatform(config)

        # Test authentication
        await client.health.check()
        print("✅ Authentication successful")

    except ArchitectAuthError as e:
        print(f"❌ Authentication failed: {e.message}")
        print(f"Error code: {e.code}")
        print(f"Request ID: {e.request_id}")

asyncio.run(test_authentication())
```

### Webhook Signature Validation (FastAPI)

```python
from fastapi import FastAPI, Request, HTTPException, Response
from architect_platform.webhooks import WebhookValidator
import os

app = FastAPI()
validator = WebhookValidator(secret=os.getenv("WEBHOOK_SECRET"))

@app.post("/webhooks/architect")
async def handle_webhook(request: Request):
    try:
        signature = request.headers.get("x-architect-signature")
        if not signature:
            raise HTTPException(status_code=401, detail="Missing signature")

        body = await request.body()
        payload = body.decode("utf-8")

        # Verify webhook signature
        if not validator.verify_signature(payload, signature):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

        # Parse and process webhook
        webhook_data = validator.parse_webhook(payload)
        print(f"🔔 Webhook received: {webhook_data.type}")

        return {"received": True, "type": webhook_data.type}

    except Exception as e:
        print(f"❌ Webhook validation error: {e}")
        raise HTTPException(status_code=400, detail="Webhook validation failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### JWT Token Authentication (Enterprise SSO)

```python
import jwt
from architect_platform import ArchitectConfig, ArchitectPlatform

# JWT-based authentication for enterprise SSO
def create_jwt_token(user_id: str, secret: str, expires_in: int = 3600) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(seconds=expires_in),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def get_jwt_headers(token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "X-Enterprise-ID": "acme-corp",
        "Content-Type": "application/json",
    }

# Use with custom client
config = ArchitectConfig(
    api_key="enterprise_api_key",
    base_url="https://enterprise.acme.com/api",
    custom_headers=get_jwt_headers(jwt_token),
)

client = ArchitectPlatform(config)
```

---

## 📊 Blueprint Management

### Generate New Blueprint

```python
from architect_platform import BlueprintRequest, GenerationOptions
from typing import List, Optional

async def generate_blueprints():
    config = ArchitectConfig(api_key="sk_arch_live_1234567890abcdef")
    client = ArchitectPlatform(config)

    # Basic blueprint generation
    basic_blueprint = await client.blueprints.generate(
        input="Build an e-commerce platform with AI recommendations",
        project_name="SmartCommerce"
    )

    # Advanced blueprint generation with options
    generation_options = GenerationOptions(
        timeout=180.0,  # 3 minutes
        retry_attempts=5,
        enable_cache=True,
        priority="high",  # For enterprise customers
        metadata={
            "industry": "fintech",
            "target_market": "SMB",
            "estimated_users": "10000-50000",
            "compliance_requirements": ["SOC2", "PCI-DSS"],
        }
    )

    advanced_blueprint = await client.blueprints.generate(
        input="Build a fintech platform for peer-to-peer lending",
        project_name="LendFlow",
        options=generation_options
    )

    print(f"Basic blueprint ID: {basic_blueprint.id}")
    print(f"Advanced blueprint ID: {advanced_blueprint.id}")

asyncio.run(generate_blueprints())
```

### Monitor Blueprint Generation Progress

```python
import asyncio
from architect_platform import BlueprintStatus

async def poll_blueprint_completion(blueprint_id: str, client: ArchitectPlatform):
    """Poll for blueprint completion with exponential backoff."""
    max_attempts = 60  # 10 minutes max
    attempt = 0
    delay = 2.0  # Start with 2 seconds

    while attempt < max_attempts:
        try:
            blueprint = await client.blueprints.get(blueprint_id)

            if blueprint.status == BlueprintStatus.COMPLETED:
                print(f"✅ Blueprint ready! Content length: {len(blueprint.content_markdown)}")
                return blueprint
            elif blueprint.status == BlueprintStatus.FAILED:
                raise RuntimeError(f"Blueprint generation failed: {blueprint.error}")
            elif blueprint.status == BlueprintStatus.GENERATING:
                print(f"⏳ Still generating... ETA: {blueprint.estimated_completion}")

            # Exponential backoff with jitter
            jitter = delay * 0.1 * (0.5 - asyncio.random.random())
            await asyncio.sleep(delay + jitter)
            delay = min(delay * 1.5, 30.0)  # Max 30 seconds
            attempt += 1

        except Exception as e:
            print(f"⚠️ Error polling blueprint: {e}")
            await asyncio.sleep(delay)
            attempt += 1

    raise TimeoutError("Blueprint generation timed out")

# Event-driven approach (recommended for enterprise)
async def setup_webhook_notifications(client: ArchitectPlatform):
    """Configure webhook notifications for blueprint completion."""
    webhook_config = {
        "url": "https://your-app.com/webhooks/blueprints",
        "events": ["blueprint.completed", "blueprint.failed"],
        "secret": "webhook_secret_key",
        "retry_policy": {
            "max_attempts": 5,
            "backoff_strategy": "exponential",
        }
    }

    await client.blueprints.generate(
        input="Build an AI-powered healthcare platform",
        project_name="HealthAI",
        webhook_config=webhook_config
    )
```

### List and Search Blueprints

```python
from architect_platform import BlueprintListParams, BlueprintStatus, SortOrder
from datetime import datetime, timedelta

async def search_blueprints():
    client = ArchitectPlatform(config)

    # List all blueprints
    all_blueprints = await client.blueprints.list(
        page=1,
        limit=20
    )
    print(f"Found {all_blueprints.total} total blueprints")

    # Advanced search and filtering
    search_params = BlueprintListParams(
        search="e-commerce",  # Search in name and description
        status=BlueprintStatus.COMPLETED,
        date_range={
            "from": (datetime.now() - timedelta(days=30)).isoformat(),
            "to": datetime.now().isoformat(),
        },
        sort_by="created_at",
        sort_order=SortOrder.DESC,
        page=1,
        limit=50,
        filters={
            "industry": ["retail", "fintech"],
            "min_credits_used": 50,
        }
    )

    search_results = await client.blueprints.list(search_params)
    print(f"Search results: {len(search_results.data)} blueprints")

    for blueprint in search_results.data:
        print(f"  - {blueprint.name} ({blueprint.status})")

asyncio.run(search_blueprints())
```

### Refine Existing Blueprint

```python
from architect_platform import RefinementRequest, RefinementType

async def refine_blueprint():
    client = ArchitectPlatform(config)

    refinement_request = RefinementRequest(
        feedback="Add mobile app support with React Native and implement real-time notifications",
        refinement_type=RefinementType.ENHANCEMENT,
        priority="high",
        metadata={
            "target_platforms": ["ios", "android"],
            "notification_types": ["push", "email", "in_app"],
        }
    )

    refined_blueprint = await client.blueprints.refine(
        blueprint_id="blueprint-uuid",
        request=refinement_request
    )

    print(f"Refinement started: {refined_blueprint.id}")
    print(f"New version: {refined_blueprint.version}")

asyncio.run(refine_blueprint())
```

---

## 🚀 Deployment Management

### Deploy to GitHub

```python
from architect_platform import GitHubDeploymentRequest, GitHubDeploymentOptions

async def deploy_to_github():
    client = ArchitectPlatform(config)

    deployment_options = GitHubDeploymentOptions(
        github_org="acme-corp",
        repo_name="smart-commerce-platform",
        is_private=False,
        branch="main",
        commit_message="Initial AI-generated platform deployment",
        enable_issues=True,
        enable_wiki=True,
        enable_discussions=False,
        collaborators=["developer1", "developer2"],  # GitHub usernames
        topics=["ai-generated", "e-commerce", "react", "nextjs"],
        auto_merge=True,  # Auto-merge pull requests
        delete_branch=False,  # Keep feature branch
    )

    deployment = await client.deployments.to_github(
        blueprint_id="blueprint-uuid",
        options=deployment_options
    )

    print(f"Repository created: {deployment.repository.html_url}")
    print(f"Deployment status: {deployment.deployment.status}")
    print(f"Clone URL: {deployment.repository.clone_url}")

asyncio.run(deploy_to_github())
```

### Monitor Deployment Progress

```python
import asyncio

async def monitor_deployment(deployment_id: str):
    client = ArchitectPlatform(config)

    while True:
        try:
            status = await client.deployments.get_status(deployment_id)

            if status.deployment.status == "completed":
                print("✅ Deployment completed successfully!")
                print(f"Repository URL: {status.deployment.repository_url}")
                print(f"Commit SHA: {status.deployment.commit_sha}")
                break
            elif status.deployment.status == "failed":
                print(f"❌ Deployment failed: {status.deployment.error}")
                break
            else:
                print(f"⏳ Deployment in progress: {status.deployment.status}")

            await asyncio.sleep(10)  # Check every 10 seconds

        except Exception as e:
            print(f"⚠️ Error monitoring deployment: {e}")
            await asyncio.sleep(30)

# Usage
asyncio.run(monitor_deployment("deployment-uuid"))
```

### Bulk Deployment (Enterprise Feature)

```python
from architect_platform import BulkDeploymentRequest

async def bulk_deploy():
    client = ArchitectPlatform(config)

    bulk_request = BulkDeploymentRequest(
        deployments=[
            {
                "blueprint_id": "blueprint-1",
                "options": {
                    "github_org": "org-1",
                    "repo_name": "project-1",
                    "is_private": True,
                }
            },
            {
                "blueprint_id": "blueprint-2",
                "options": {
                    "github_org": "org-2",
                    "repo_name": "project-2",
                    "is_private": False,
                }
            },
            {
                "blueprint_id": "blueprint-3",
                "options": {
                    "github_org": "org-3",
                    "repo_name": "project-3",
                    "is_private": True,
                }
            },
        ],
        parallel_limit=3,  # Run up to 3 deployments in parallel
        on_failure="continue",  # Continue other deployments if one fails
    )

    bulk_result = await client.deployments.bulk(bulk_request)

    print(f"Started {len(bulk_result.deployment_ids)} deployments")

    for deployment_id in bulk_result.deployment_ids:
        print(f"  - Deployment: {deployment_id}")

    # Monitor all deployments
    await monitor_bulk_deployments(bulk_result.deployment_ids)

async def monitor_bulk_deployments(deployment_ids: List[str]):
    """Monitor multiple deployments concurrently."""
    tasks = [monitor_deployment(deployment_id) for deployment_id in deployment_ids]
    await asyncio.gather(*tasks, return_exceptions=True)

asyncio.run(bulk_deploy())
```

---

## 📈 Project Management

### Create and Manage Projects

```python
from architect_platform import ProjectRequest, ProjectSettings

async def manage_projects():
    client = ArchitectPlatform(config)

    # Create new project
    project_request = ProjectRequest(
        name="Q1 2025 Innovation Pipeline",
        description="AI-generated platform prototypes for Q1 2025",
        tags=["innovation", "ai", "prototyping"],
        settings=ProjectSettings(
            default_blueprint_template="enterprise-saas",
            auto_deploy=False,
            notify_on_completion=True,
            default_visibility="private",
        ),
        metadata={
            "department": "innovation",
            "budget_allocation": 50000,
            "target_completion": "2025-03-31",
        }
    )

    project = await client.projects.create(project_request)
    print(f"Created project: {project.id}")

    # Add blueprints to project
    await client.projects.add_blueprint(
        project_id=project.id,
        blueprint_id="blueprint-uuid"
    )

    # Get project with analytics
    project_details = await client.projects.get(
        project_id=project.id,
        include_analytics=True,
        include_blueprints=True
    )

    print(f"Project stats: {project_details.analytics.model_dump()}")
    print(f"Total blueprints: {project_details.analytics.blueprint_count}")
    print(f"Completion rate: {project_details.analytics.completion_rate}")

asyncio.run(manage_projects())
```

### Project Analytics and Reporting

```python
from architect_platform import ProjectAnalyticsParams
from datetime import datetime, timedelta

async def generate_project_reports():
    client = ArchitectPlatform(config)

    # Get project analytics
    analytics_params = ProjectAnalyticsParams(
        date_range={
            "from": (datetime.now() - timedelta(days=90)).isoformat(),
            "to": datetime.now().isoformat(),
        },
        include_cost_breakdown=True,
        include_performance_metrics=True,
        include_user_activity=True,
    )

    analytics = await client.projects.get_analytics("project-uuid", analytics_params)

    print(f"Total cost: ${analytics.total_cost:.2f}")
    print(f"Blueprints generated: {analytics.blueprints_generated}")
    print(f"Average completion time: {analytics.average_completion_time:.1f}s")
    print(f"Success rate: {analytics.success_rate:.1%}")

    # Generate cost breakdown by user
    for user_cost in analytics.cost_by_user:
        print(f"  {user_cost.user_id}: ${user_cost.cost:.2f} ({user_cost.blueprints} blueprints)")

asyncio.run(generate_project_reports())
```

---

## 💳 Credits & Billing

### Monitor Credit Usage

```python
from architect_platform import CreditUsageParams
from datetime import datetime, timedelta

async def monitor_credits():
    client = ArchitectPlatform(config)

    # Get current credit balance
    balance = await client.credits.get_balance()
    print(f"Available credits: {balance.credits}")
    print(f"Subscription tier: {balance.subscription_tier}")
    print(f"Credits expire: {balance.credits_expire_at}")

    # Get detailed usage analytics
    usage_params = CreditUsageParams(
        date_range="last-30-days",
        granularity="day",
        group_by="operation",
    )

    usage = await client.credits.get_usage(usage_params)

    print(f"\nDaily usage breakdown:")
    for daily in usage.daily_breakdown:
        print(f"  {daily.date}: {daily.credits_used} credits (${daily.cost:.2f})")

    print(f"\nCost by operation:")
    for operation in usage.cost_by_operation:
        print(f"  {operation.operation}: {operation.credits_used} credits (${operation.cost:.2f})")

asyncio.run(monitor_credits())
```

### Enterprise Credit Management

```python
from architect_platform import PurchaseRequest, AutoRechargeConfig

async def manage_enterprise_credits():
    client = ArchitectPlatform(config)

    # Purchase credits programmatically
    purchase_request = PurchaseRequest(
        amount=10000,  # $100 USD
        payment_method_id="pm_stripe_1234567890",
        purchase_order="PO-2025-001",
        billing_email="finance@acme.com",
        metadata={
            "department": "engineering",
            "cost_center": "CTO-001",
            "project": "Q1-innovation",
        }
    )

    purchase = await client.credits.purchase(purchase_request)
    print(f"Purchase initiated: {purchase.transaction_id}")

    # Set up automatic top-up
    auto_recharge_config = AutoRechargeConfig(
        threshold=1000,  # Auto-recharge when below 1000 credits
        amount=5000,     # Add 5000 credits
        payment_method_id="pm_stripe_1234567890",
        max_per_month=20000,  # Maximum auto-recharge per month
    )

    await client.credits.set_auto_recharge(auto_recharge_config)
    print("✅ Auto-recharge configured")

    # Get subscription details
    subscription = await client.credits.get_subscription()
    print(f"Subscription: {subscription.plan}")
    print(f"Status: {subscription.status}")
    print(f"Next billing: {subscription.next_billing_date}")

asyncio.run(manage_enterprise_credits())
```

---

## 📊 Performance & Monitoring

### System Health Monitoring

```python
import asyncio
from architect_platform import HealthCheckParams

async def health_monitoring():
    client = ArchitectPlatform(config)

    # Basic health check
    health = await client.health.check()

    if health.status == "healthy":
        print("✅ All systems operational")
        print(f"  Database latency: {health.services.database.response_time}ms")
        print(f"  AI service status: {health.services.ai_iflow.status}")
    else:
        print(f"⚠️ System status: {health.status}")
        for service_name, service in health.services.items():
            if service.status == "unhealthy":
                print(f"  ❌ {service_name}: {service.error}")

    # Detailed health with service breakdown
    detailed_params = HealthCheckParams(
        detailed=True,
        include_performance_metrics=True,
        include_dependencies=True,
        timeout=10.0,
    )

    detailed_health = await client.health.check(detailed_params)

    # System health monitoring with alerts
    await setup_health_alerts(client)

async def setup_health_alerts(client: ArchitectPlatform):
    """Set up health monitoring with custom alerts."""
    while True:
        try:
            health = await client.health.check({"detailed": True})

            # Alert on service degradation
            if health.services.ai_iflow.response_time > 5000:
                print("⚠️ AI service degradation detected")
                await client.alerts.create({
                    "type": "service_degradation",
                    "service": "ai-iflow",
                    "threshold": 5000,
                    "current_value": health.services.ai_iflow.response_time,
                    "severity": "warning",
                })

            # Alert on circuit breaker activation
            if health.services.research_tavily.circuit_state == "OPEN":
                print("🚨 Research service circuit breaker is OPEN")
                # Implement fallback strategy
                await activate_research_fallback()

            await asyncio.sleep(60)  # Check every minute

        except Exception as e:
            print(f"Health monitoring error: {e}")
            await asyncio.sleep(60)

async def activate_research_fallback():
    """Implement fallback research strategy."""
    print("🔄 Activating research fallback strategy")
    # Implement your fallback logic here

asyncio.run(health_monitoring())
```

### Performance Analytics

```python
from architect_platform import PerformanceMetricsParams
import asyncio

async def performance_monitoring():
    client = ArchitectPlatform(config)

    metrics_params = PerformanceMetricsParams(
        time_window="1h",
        include_cache_metrics=True,
        include_database_metrics=True,
        include_ai_services=True,
        include_system_metrics=True,
        granularity="minute",
    )

    performance = await client.monitoring.get_performance(metrics_params)

    print(f"API Performance:")
    print(f"  Average response time: {performance.api.average_response_time}ms")
    print(f"  Requests per minute: {performance.api.requests_per_minute}")
    print(f"  Error rate: {performance.api.error_rate:.2%}")
    print(f"  Status codes: {performance.api.status_codes}")

    print(f"\nDatabase Performance:")
    print(f"  Connection pool active: {performance.database.connection_pool.active}")
    print(f"  Average query time: {performance.database.queries.average_time}ms")
    print(f"  Slow queries: {performance.database.queries.slow}")

    print(f"\nAI Services Performance:")
    for service_name, service in performance.ai.items():
        print(f"  {service_name}:")
        print(f"    Requests: {service.requests}")
        print(f"    Success rate: {service.success_rate:.2%}")
        print(f"    Average time: {service.average_time}ms")

    # Performance optimization recommendations
    if performance.ai.iflow.average_response_time > 2000:
        print("💡 Recommendation: Consider AI service optimization")
        await generate_optimization_report(client)

async def generate_optimization_report(client: ArchitectPlatform):
    """Generate and display optimization recommendations."""
    optimization = await client.monitoring.get_optimization_recommendations()

    print("🚀 Optimization Recommendations:")

    for category, recs in optimization.model_dump().items():
        if recs["recommendations"]:
            print(f"\n  {category.upper()}:")
            for rec in recs["recommendations"]:
                print(f"    • {rec}")
            print(f"    Potential improvement: {recs['potential_improvement']}")

asyncio.run(performance_monitoring())
```

---

## 🛠️ Advanced Error Handling

### Comprehensive Exception Management

```python
import asyncio
import sys
from architect_platform import (
    ArchitectPlatform,
    ArchitectError,
    ValidationError,
    RateLimitError,
    PaymentRequiredError,
    ServiceUnavailableError,
    NotFoundError,
    AuthenticationError,
)

async def handle_errors_gracefully():
    client = ArchitectPlatform(config)

    try:
        blueprint = await client.blueprints.generate({
            "input": "Build a complex enterprise platform",
            "project_name": "EnterpriseApp",
        })

        return blueprint

    except ValidationError as e:
        print(f"❌ Validation Error: {e.message}")
        print(f"Field errors: {e.details}")
        return None

    except RateLimitError as e:
        print(f"⏱️ Rate Limit Error: {e.message}")
        print(f"Retry after: {e.retry_after} seconds")
        print(f"Limit: {e.limit} requests per {e.window}")

        # Implement exponential backoff
        delay = min(2 ** e.retry_attempts * 1.0, 60.0)  # Max 60 seconds
        print(f"Retrying in {delay} seconds...")
        await asyncio.sleep(delay)
        return await handle_errors_gracefully()  # Retry

    except PaymentRequiredError as e:
        print(f"💳 Payment Required: {e.message}")
        print(f"Required credits: {e.required_credits}")
        print(f"Available credits: {e.available_credits}")

        # Trigger credit purchase flow
        await trigger_credit_purchase()

    except ServiceUnavailableError as e:
        print(f"🔧 Service Unavailable: {e.message}")
        print(f"Affected services: {e.affected_services}")
        print(f"Estimated recovery: {e.estimated_recovery_time} seconds")

        # Implement fallback strategy
        return await fallback_strategy()

    except NotFoundError as e:
        print(f"🔍 Not Found: {e.message}")
        print(f"Resource type: {e.resource_type}")
        print(f"Resource ID: {e.resource_id}")

    except AuthenticationError as e:
        print(f"🔐 Authentication Error: {e.message}")
        print(f"Error code: {e.code}")
        sys.exit(1)  # Authentication errors are critical

    except ArchitectError as e:
        print(f"🚨 Platform Error: {e.message}")
        print(f"Error code: {e.code}")
        print(f"Request ID: {e.request_id}")

        # Log for debugging and support
        await log_error_for_support(e)

    except Exception as e:
        print(f"❓ Unknown Error: {e}")
        raise  # Re-throw unexpected errors

async def trigger_credit_purchase():
    """Handle credit purchase flow."""
    print("🔄 Initiating credit purchase...")
    # Implement your credit purchase logic here

async def fallback_strategy():
    """Implement fallback strategy when services are unavailable."""
    print("🔄 Activating fallback strategy...")
    # Implement your fallback logic here
    return {"status": "fallback_activated"}

async def log_error_for_support(error: ArchitectError):
    """Log error details for support team."""
    error_report = {
        "error_type": error.__class__.__name__,
        "message": error.message,
        "code": error.code,
        "request_id": error.request_id,
        "timestamp": datetime.now().isoformat(),
        "stack_trace": traceback.format_exc(),
    }

    print(f"🆘 Error Report: {error_report}")
    # Send to your logging service or support team

asyncio.run(handle_errors_gracefully())
```

### Retry and Circuit Breaker Patterns

```python
from architect_platform import RetryConfig, CircuitBreakerConfig
from dataclasses import dataclass
from typing import Type, List

@dataclass
class CustomRetryConfig(RetryConfig):
    max_attempts: int = 5
    base_delay: float = 1.0
    max_delay: float = 60.0
    backoff_multiplier: float = 2.0
    jitter: bool = True
    retryable_errors: List[Type[Exception]] = None

    def __post_init__(self):
        if self.retryable_errors is None:
            self.retryable_errors = [
                ServiceUnavailableError,
                RateLimitError,
                NetworkError,
                TimeoutError,
            ]

@dataclass
class CustomCircuitBreakerConfig(CircuitBreakerConfig):
    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    monitoring_period: float = 120.0
    expected_recovery_time: float = 30.0

async def create_resilient_client():
    """Create client with advanced resilience patterns."""
    config = ArchitectConfig(
        api_key="sk_arch_live_1234567890abcdef",
        retry_config=CustomRetryConfig(
            max_attempts=10,  # More retries for expensive operations
            base_delay=2.0,    # Longer base delay
            backoff_multiplier=1.5,
        ),
        circuit_breaker_config=CustomCircuitBreakerConfig(
            failure_threshold=3,  # More sensitive for production
            recovery_timeout=120.0,  # Longer recovery time
        ),
        enable_logging=True,
    )

    return ArchitectPlatform(config)

# Custom retry logic for specific operations
async def generate_blueprint_with_retry(client: ArchitectPlatform, input: str, project_name: str):
    """Generate blueprint with custom retry strategy."""
    retry_config = CustomRetryConfig(
        max_attempts=15,  # Even more retries for expensive operations
        base_delay=5.0,   # Longer base delay
        max_delay=300.0,  # 5 minutes max delay
        backoff_multiplier=1.3,  # Gentler backoff
    )

    return await client.blueprints.generate(
        input=input,
        project_name=project_name,
        retry_config=retry_config,
    )

asyncio.run(create_resilient_client())
```

---

## 🧪 Testing & Development

### Mocking for Unit Tests (pytest)

```python
# test_architect_platform.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from architect_platform import ArchitectPlatform, ArchitectConfig, Blueprint
from architect_platform.testing import ArchitectPlatformMock

@pytest.fixture
def mock_client():
    """Create a mocked client for testing."""
    return ArchitectPlatformMock()

@pytest.fixture
def real_client():
    """Create a real client with test configuration."""
    config = ArchitectConfig(
        api_key="test_key",
        base_url="http://localhost:3000/api",
        enable_logging=True,
    )
    return ArchitectPlatform(config)

@pytest.mark.asyncio
async def test_generate_blueprint_success(mock_client: ArchitectPlatformMock):
    """Test successful blueprint generation."""
    # Configure mock response
    mock_client.blueprints.generate.return_value = Blueprint(
        id="test-blueprint-id",
        name="Test Platform",
        status="completed",
        content_markdown="# Test Blueprint Content",
        structured_data={"tech_stack": ["Next.js", "PostgreSQL"]},
    )

    # Test the method
    result = await mock_client.blueprints.generate(
        input="Test input",
        project_name="TestProject",
    )

    # Assertions
    assert result.id == "test-blueprint-id"
    assert result.status == "completed"
    assert "Next.js" in result.structured_data["tech_stack"]

    # Verify the mock was called with correct parameters
    mock_client.blueprints.generate.assert_called_once_with(
        input="Test input",
        project_name="TestProject",
    )

@pytest.mark.asyncio
async def test_blueprint_not_found_error():
    """Test handling of blueprint not found error."""
    config = ArchitectConfig(api_key="test_key")
    client = ArchitectPlatform(config)

    # Mock the HTTP client to return 404
    client.http_client.get.return_value = AsyncMock(
        status_code=404,
        json=lambda: {"error": "Blueprint not found"}
    )

    with pytest.raises(NotFoundError) as exc_info:
        await client.blueprints.get("nonexistent-id")

    assert "Blueprint not found" in str(exc_info.value)

@pytest.mark.asyncio
async def test_rate_limit_error():
    """Test rate limit error handling."""
    config = ArchitectConfig(api_key="test_key")
    client = ArchitectPlatform(config)

    # Mock rate limit response
    client.http_client.post.return_value = AsyncMock(
        status_code=429,
        headers={"Retry-After": "60"},
        json=lambda: {"error": "Rate limit exceeded"}
    )

    with pytest.raises(RateLimitError) as exc_info:
        await client.blueprints.generate(
            input="Test input",
            project_name="TestProject",
        )

    assert exc_info.value.retry_after == 60
    assert "Rate limit" in str(exc_info.value)

# Integration tests
@pytest.mark.integration
@pytest.mark.asyncio
async def test_real_blueprint_generation(real_client: ArchitectPlatform):
    """Integration test with real API (requires test environment)."""
    # This test requires a real test environment
    result = await real_client.blueprints.generate(
        input="Simple test platform",
        project_name="TestProject",
        timeout=30.0,  # Shorter timeout for tests
    )

    assert result.id is not None
    assert result.status in ["generating", "completed", "failed"]

if __name__ == "__main__":
    pytest.main([__file__])
```

### Development Tools and Debugging

```python
from architect_platform import ArchitectPlatform, ArchitectConfig, LogLevel
import asyncio
import json
import time

class DevelopmentClient(ArchitectPlatform):
    """Enhanced client with development tools."""

    def __init__(self, config: ArchitectConfig):
        super().__init__(config)
        self.request_times = []
        self.error_count = 0

    async def _make_request(self, method: str, url: str, **kwargs):
        """Override to add timing and logging."""
        start_time = time.time()

        print(f"🔵 Request: {method} {url}")
        if kwargs.get("json"):
            print(f"  Body: {json.dumps(kwargs['json'], indent=2)}")

        try:
            response = await super()._make_request(method, url, **kwargs)
            duration = time.time() - start_time
            self.request_times.append(duration)

            print(f"🟢 Response: {response.status_code} ({duration:.3f}s)")
            return response

        except Exception as e:
            self.error_count += 1
            duration = time.time() - start_time
            print(f"🔴 Error: {e} ({duration:.3f}s)")
            raise

    def get_performance_stats(self):
        """Get performance statistics for development."""
        if not self.request_times:
            return "No requests made yet"

        return {
            "total_requests": len(self.request_times),
            "average_time": sum(self.request_times) / len(self.request_times),
            "min_time": min(self.request_times),
            "max_time": max(self.request_times),
            "error_count": self.error_count,
            "error_rate": self.error_count / len(self.request_times),
        }

async def development_demo():
    """Demonstrate development tools."""
    config = ArchitectConfig(
        api_key="test_key",
        base_url="http://localhost:3000/api",
        enable_logging=True,
        log_level=LogLevel.DEBUG,
    )

    client = DevelopmentClient(config)

    try:
        # Make some requests to demonstrate logging
        await client.health.check()
        await client.blueprints.list()

        # Show performance stats
        stats = client.get_performance_stats()
        print(f"\n📊 Performance Stats:")
        for key, value in stats.items():
            print(f"  {key}: {value}")

    except Exception as e:
        print(f"Demonstration error: {e}")

asyncio.run(development_demo())
```

---

## 📚 Best Practices & Patterns

### Production Configuration

```python
# production_config.py
from architect_platform import ArchitectConfig, RetryConfig, CircuitBreakerConfig
import os
from typing import Dict
import httpx
import logging

class ProductionConfig:
    @staticmethod
    def create() -> ArchitectConfig:
        """Create production-ready configuration."""
        return ArchitectConfig(
            # Authentication
            api_key=os.getenv("ARCHITECT_API_KEY"),
            base_url=os.getenv("ARCHITECT_BASE_URL", "https://api.architect-platform.com"),

            # Performance
            timeout=180.0,  # 3 minutes for production workloads
            retry_config=RetryConfig(
                max_attempts=5,
                base_delay=2.0,
                max_delay=60.0,
                backoff_multiplier=2.0,
                jitter=True,
            ),
            circuit_breaker_config=CircuitBreakerConfig(
                failure_threshold=5,
                recovery_timeout=120.0,
                monitoring_period=180.0,
            ),

            # Monitoring
            enable_logging=False,  # Minimize production noise
            log_level=LogLevel.WARN,
            custom_headers={
                "X-Client-Version": "1.0.0",
                "X-Environment": "production",
                "X-Instance-ID": os.getenv("INSTANCE_ID", "unknown"),
            },

            # HTTP client optimization
            http_client=httpx.AsyncClient(
                limits=httpx.Limits(
                    max_keepalive_connections=50,
                    max_connections=100,
                ),
                timeout=httpx.Timeout(
                    connect=10.0,
                    read=180.0,
                    write=30.0,
                    pool=60.0,
                ),
            ),
        )

class MonitoringClient(ArchitectPlatform):
    """Enhanced client with production monitoring."""

    def __init__(self, config: ArchitectConfig):
        super().__init__(config)
        self.logger = logging.getLogger(__name__)
        self.metrics = {
            "requests": 0,
            "errors": 0,
            "response_times": [],
        }

    async def _make_request(self, method: str, url: str, **kwargs):
        """Override to add production monitoring."""
        start_time = time.time()
        self.metrics["requests"] += 1

        try:
            response = await super()._make_request(method, url, **kwargs)
            duration = time.time() - start_time
            self.metrics["response_times"].append(duration)

            # Log slow requests
            if duration > 5.0:
                self.logger.warning(
                    f"Slow request: {method} {url} took {duration:.2f}s"
                )

            return response

        except Exception as e:
            duration = time.time() - start_time
            self.metrics["errors"] += 1

            # Log errors with context
            self.logger.error(
                f"Request failed: {method} {url} after {duration:.2f}s - {e}",
                extra={
                    "method": method,
                    "url": url,
                    "duration": duration,
                    "error_type": type(e).__name__,
                }
            )

            raise

    def get_metrics(self) -> Dict:
        """Get production metrics."""
        response_times = self.metrics["response_times"]

        return {
            "total_requests": self.metrics["requests"],
            "total_errors": self.metrics["errors"],
            "error_rate": self.metrics["errors"] / max(self.metrics["requests"], 1),
            "average_response_time": (
                sum(response_times) / len(response_times) if response_times else 0
            ),
            "p95_response_time": (
                sorted(response_times)[int(len(response_times) * 0.95)]
                if len(response_times) > 20 else 0
            ),
        }

# Usage
client = MonitoringClient(ProductionConfig.create())
```

### Batch Operations Optimization

```python
import asyncio
from typing import List, Dict, Any
from dataclasses import dataclass
from architect_platform import BlueprintRequest, Blueprint

@dataclass
class BatchResult:
    successful: List[Blueprint]
    failed: List[Dict[str, Any]]
    total_time: float

class BatchOptimizer:
    """Optimize batch operations for maximum performance."""

    def __init__(self, client: ArchitectPlatform, batch_size: int = 5):
        self.client = client
        self.batch_size = batch_size
        self.semaphore = asyncio.Semaphore(batch_size)

    async def generate_blueprints(
        self,
        requests: List[BlueprintRequest],
        delay_between_batches: float = 2.0,
    ) -> BatchResult:
        """Generate multiple blueprints with optimized batching."""
        start_time = time.time()
        successful = []
        failed = []

        # Process in batches
        for i in range(0, len(requests), self.batch_size):
            batch = requests[i:i + self.batch_size]

            # Create tasks for concurrent processing
            tasks = [
                self._generate_with_semaphore(request)
                for request in batch
            ]

            # Wait for batch completion
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Process results
            for result in results:
                if isinstance(result, Exception):
                    failed.append({
                        "error": str(result),
                        "type": type(result).__name__,
                    })
                else:
                    successful.append(result)

            # Rate limit delay between batches
            if i + self.batch_size < len(requests):
                await asyncio.sleep(delay_between_batches)

        total_time = time.time() - start_time
        return BatchResult(successful, failed, total_time)

    async def _generate_with_semaphore(self, request: BlueprintRequest) -> Blueprint:
        """Generate blueprint with semaphore control."""
        async with self.semaphore:
            return await self.client.blueprints.generate(request.model_dump())

# Usage example
async def batch_generation_example():
    config = ArchitectConfig(api_key="your_api_key")
    client = ArchitectPlatform(config)
    optimizer = BatchOptimizer(client, batch_size=3)

    # Create batch requests
    requests = [
        BlueprintRequest(
            input=f"E-commerce platform {i}",
            project_name=f"Ecommerce{i}",
        )
        for i in range(10)
    ]

    # Generate with optimization
    result = await optimizer.generate_blueprints(requests)

    print(f"Generated {len(result.successful)} blueprints successfully")
    print(f"Failed: {len(result.failed)}")
    print(f"Total time: {result.total_time:.2f}s")
    print(f"Average time per blueprint: {result.total_time / len(requests):.2f}s")

asyncio.run(batch_generation_example())
```

### Cache Integration (Redis)

```python
import redis
import json
import pickle
from typing import Optional, Any
from architect_platform import ArchitectPlatform, ArchitectConfig, Blueprint

class CachedArchitectClient(ArchitectPlatform):
    """Client with Redis caching for better performance."""

    def __init__(self, config: ArchitectConfig, redis_url: str):
        super().__init__(config)
        self.redis = redis.from_url(redis_url)
        self.cache_prefix = "architect:"
        self.cache_ttl = 300  # 5 minutes

    async def get_blueprint(self, blueprint_id: str, use_cache: bool = True) -> Blueprint:
        """Get blueprint with caching."""
        cache_key = f"{self.cache_prefix}blueprint:{blueprint_id}"

        if use_cache:
            try:
                cached_data = self.redis.get(cache_key)
                if cached_data:
                    blueprint = pickle.loads(cached_data)
                    print(f"🎯 Cache hit for blueprint: {blueprint_id}")
                    return blueprint
            except Exception as e:
                print(f"⚠️ Cache error: {e}")

        # Cache miss or disabled - fetch from API
        blueprint = await super().blueprints.get(blueprint_id)

        # Cache completed blueprints
        if use_cache and blueprint.status == "completed":
            try:
                self.redis.setex(
                    cache_key,
                    self.cache_ttl,
                    pickle.dumps(blueprint),
                )
                print(f"💾 Cached blueprint: {blueprint_id}")
            except Exception as e:
                print(f"⚠️ Cache write error: {e}")

        return blueprint

    async def invalidate_blueprint_cache(self, blueprint_id: str) -> None:
        """Invalidate cached blueprint."""
        cache_key = f"{self.cache_prefix}blueprint:{blueprint_id}"
        try:
            self.redis.delete(cache_key)
            print(f"🗑️ Invalidated cache for blueprint: {blueprint_id}")
        except Exception as e:
            print(f"⚠️ Cache invalidation error: {e}")

    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get Redis cache statistics."""
        try:
            info = self.redis.info()
            keyspace_hits = info.get("keyspace_hits", 0)
            keyspace_misses = info.get("keyspace_misses", 0)

            return {
                "total_keys": info.get("db0", {}).get("keys", 0),
                "memory_usage": info.get("used_memory_human", "unknown"),
                "hit_rate": (
                    keyspace_hits / (keyspace_hits + keyspace_misses)
                    if keyspace_hits + keyspace_misses > 0 else 0
                ),
                "hits": keyspace_hits,
                "misses": keyspace_misses,
            }
        except Exception as e:
            return {"error": str(e)}

# Usage
async def cached_client_example():
    config = ArchitectConfig(api_key="your_api_key")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

    cached_client = CachedArchitectClient(config, redis_url)

    # First call - cache miss
    blueprint1 = await cached_client.get_blueprint("blueprint-id", use_cache=True)

    # Second call - cache hit
    blueprint2 = await cached_client.get_blueprint("blueprint-id", use_cache=True)

    # Get cache stats
    stats = await cached_client.get_cache_stats()
    print(f"Cache stats: {stats}")

asyncio.run(cached_client_example())
```

---

## 🐳 Docker Integration

```dockerfile
# Dockerfile for Python SDK applications
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import architect_platform; print('SDK OK')" || exit 1

# Run the application
CMD ["python", "main.py"]
```

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build: .
    environment:
      - ARCHITECT_API_KEY=${ARCHITECT_API_KEY}
      - ARCHITECT_BASE_URL=${ARCHITECT_BASE_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

---

## 📄 Changelog & Versioning

### Version 1.0.0 Features

- ✅ Full Python 3.8+ support with type hints
- ✅ Async/await support throughout
- ✅ All API endpoints covered
- ✅ Enterprise-grade error handling
- ✅ Retry and circuit breaker patterns
- ✅ Webhook signature validation
- ✅ Performance monitoring and analytics
- ✅ Development tools and mocking support
- ✅ Comprehensive examples and best practices
- ✅ Docker integration support

### Migration Guide

```python
# From 0.x to 1.x
# Old:
from architect_sdk import ArchitectClient
client = ArchitectClient(api_key="key")

# New:
from architect_platform import ArchitectPlatform, ArchitectConfig
config = ArchitectConfig(api_key="key")
client = ArchitectPlatform(config)

# Method names updated for consistency
# client.generate_blueprint() → client.blueprints.generate()
# client.deploy_github() → client.deployments.to_github()
```

---

## 🤝 Community & Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/architect-platform/python-sdk/issues)
- **Documentation**: [Full API reference](https://docs.architect-platform.com/python-sdk)
- **Community Discord**: [Join our developer community](https://discord.gg/architect-platform)
- **PyPI Package**: [architect-platform-sdk](https://pypi.org/project/architect-platform-sdk/)
- **Enterprise Support**: enterprise@architect-platform.com

---

## 📜 License

MIT License - see [LICENSE](https://github.com/architect-platform/python-sdk/blob/main/LICENSE) file for details.

---

_This Python SDK is officially maintained by the Architect Platform team and follows semantic versioning for predictable updates._
