import { ProjectTemplate } from "@/lib/services/project-clone-service";

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "webapp",
    name: "Web Application",
    description: "Full-stack web application with frontend and backend components",
    complexity: "intermediate",
    estimatedCredits: 50,
    blueprints: [
      {
        version: 1,
        contentMarkdown: `# Web Application Blueprint

## Overview
A comprehensive web application template with modern best practices.

## Tech Stack
- Frontend: Next.js 15 with TypeScript
- Backend: Next.js API Routes
- Database: PostgreSQL with Drizzle ORM
- Authentication: Clerk
- Styling: Tailwind CSS

## Features
- Responsive design
- User authentication
- Database integration
- API endpoints
- Error handling
- Type safety

## Getting Started
1. Install dependencies
2. Configure environment variables
3. Run development server
4. Build for production

## Best Practices
- Component-driven architecture
- Service layer separation
- Comprehensive error handling
- Type-safe database operations`,
        structuredData: {
          type: "webapp",
          features: [
            "authentication",
            "database",
            "api",
            "frontend",
          ],
          techStack: {
            frontend: "Next.js 15",
            backend: "Next.js API Routes",
            database: "PostgreSQL",
            orm: "Drizzle",
            auth: "Clerk",
          },
        },
      },
    ],
  },
  {
    id: "api",
    name: "REST API",
    description: "Scalable REST API with comprehensive error handling and documentation",
    complexity: "beginner",
    estimatedCredits: 30,
    blueprints: [
      {
        version: 1,
        contentMarkdown: `# REST API Blueprint

## Overview
Production-ready REST API with robust error handling and validation.

## Tech Stack
- Framework: Next.js 15 API Routes
- Validation: Zod
- Database: PostgreSQL with Drizzle ORM
- Authentication: Clerk
- Rate Limiting: Redis-based

## Features
- RESTful endpoints
- Request validation
- Error handling
- Rate limiting
- Authentication middleware
- API documentation

## API Routes
- GET /api/resource - List resources
- POST /api/resource - Create resource
- PUT /api/resource/:id - Update resource
- DELETE /api/resource/:id - Delete resource

## Best Practices
- Input validation
- Proper HTTP status codes
- Consistent response format
- Rate limiting
- Error logging`,
        structuredData: {
          type: "api",
          features: [
            "rest",
            "validation",
            "authentication",
            "rate-limiting",
          ],
          techStack: {
            framework: "Next.js API Routes",
            validation: "Zod",
            database: "PostgreSQL",
            orm: "Drizzle",
            auth: "Clerk",
          },
        },
      },
    ],
  },
  {
    id: "microservice",
    name: "Microservice",
    description: "Independent microservice with containerization and monitoring",
    complexity: "advanced",
    estimatedCredits: 75,
    blueprints: [
      {
        version: 1,
        contentMarkdown: `# Microservice Blueprint

## Overview
Production-ready microservice with containerization and observability.

## Tech Stack
- Runtime: Node.js with TypeScript
- Database: PostgreSQL with Drizzle ORM
- Containerization: Docker
- Monitoring: Custom metrics
- Logging: Structured logging

## Features
- Independent deployment
- Health checks
- Metrics collection
- Structured logging
- Error tracking
- Circuit breakers

## Architecture
- API Gateway compatibility
- Database isolation
- Async processing
- Event-driven architecture support

## Best Practices
- 12-factor app principles
- Stateless design
- Graceful shutdown
- Health endpoints
- Observability`,
        structuredData: {
          type: "microservice",
          features: [
            "docker",
            "health-checks",
            "metrics",
            "logging",
            "circuit-breaker",
          ],
          techStack: {
            runtime: "Node.js",
            language: "TypeScript",
            database: "PostgreSQL",
            orm: "Drizzle",
            container: "Docker",
          },
        },
      },
    ],
  },
  {
    id: "fullstack",
    name: "Full-Stack Application",
    description: "Complete full-stack application with frontend, backend, and database",
    complexity: "advanced",
    estimatedCredits: 100,
    blueprints: [
      {
        version: 1,
        contentMarkdown: `# Full-Stack Application Blueprint

## Overview
Comprehensive full-stack application with all components integrated.

## Tech Stack
- Frontend: Next.js 15 with TypeScript
- Backend: Next.js API Routes
- Database: PostgreSQL with Drizzle ORM
- Authentication: Clerk
- Caching: Redis
- Containerization: Docker

## Features
- Modern UI with Tailwind CSS
- Authentication and authorization
- Database operations
- API endpoints
- Caching layer
- Real-time updates
- File uploads
- Email notifications
- Background jobs

## Architecture
- Service layer pattern
- Component-driven UI
- Type-safe operations
- Error handling
- Logging and monitoring

## Getting Started
1. Clone the blueprint
2. Configure environment variables
3. Set up database
4. Run migrations
5. Start development server

## Production Deployment
1. Build the application
2. Configure production environment
3. Set up database and Redis
4. Deploy with Docker
5. Configure monitoring and logging

## Best Practices
- Clean architecture
- Type safety
- Comprehensive testing
- Performance optimization
- Security best practices`,
        structuredData: {
          type: "fullstack",
          features: [
            "authentication",
            "database",
            "api",
            "frontend",
            "caching",
            "realtime",
            "file-uploads",
            "email",
            "background-jobs",
          ],
          techStack: {
            frontend: "Next.js 15",
            backend: "Next.js API Routes",
            database: "PostgreSQL",
            orm: "Drizzle",
            auth: "Clerk",
            cache: "Redis",
            container: "Docker",
          },
        },
      },
    ],
  },
];
