# Post Service

A microservice for managing blog posts and content in the NestJS microservices architecture.

## 🚀 Features

- **Post Management**: Full CRUD operations for blog posts
- **User Integration**: Integration with Auth Service for user authentication
- **Search & Filtering**: Advanced search and filtering capabilities
- **Pagination**: Efficient pagination for large datasets
- **Soft Delete**: Soft delete functionality with audit trails
- **gRPC Microservice**: Inter-service communication via gRPC
- **REST API**: HTTP endpoints for post operations
- **Database Integration**: PostgreSQL with Prisma ORM
- **Caching**: Redis-based caching for performance
- **Internationalization**: Multi-language support with nestjs-i18n
- **API Documentation**: Swagger/OpenAPI documentation
- **Health Checks**: Built-in health monitoring
- **Security**: JWT authentication and authorization

## 🏗️ Architecture

### Technology Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis with cache-manager
- **Authentication**: JWT with Passport.js
- **API Documentation**: Swagger/OpenAPI
- **Microservice**: gRPC communication
- **Validation**: class-validator and class-transformer
- **Testing**: Jest

### Service Structure

```
src/
├── app/                    # Application bootstrap
├── common/                 # Shared modules and utilities
│   ├── config/            # Configuration management
│   ├── constants/         # Application constants
│   ├── decorators/        # Custom decorators
│   ├── dtos/             # Data Transfer Objects
│   ├── enums/            # Application enums
│   ├── filters/          # Exception filters
│   ├── guards/           # Authentication guards
│   ├── interceptors/     # Response interceptors
│   ├── interfaces/       # TypeScript interfaces
│   ├── middlewares/      # Request middlewares
│   └── services/         # Shared services
├── generated/            # gRPC generated code
├── languages/            # i18n translation files
├── modules/             # Feature modules
│   └── post/            # Post management module
├── services/            # External service integrations
│   └── auth/            # Auth service integration
└── protos/              # gRPC protocol buffers
```

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL
- Redis
- Auth Service (for authentication)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd post
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   The service includes a pre-configured `.env.docker` file with the following variables:
   ```env
   # App Configuration
   NODE_ENV="local"
   APP_NAME="post"
   APP_CORS_ORIGINS="*"
   APP_DEBUG=true

   # HTTP Configuration
   HTTP_ENABLE=true
   HTTP_HOST="0.0.0.0"
   HTTP_PORT=9002
   HTTP_VERSIONING_ENABLE=true
   HTTP_VERSION=1

   # Database Configuration
   DATABASE_URL="postgresql://admin:master123@localhost:5432/postgres?schema=public"

   # JWT Configuration
   ACCESS_TOKEN_SECRET_KEY="EAJYjNJUnRGJ6uq1YfGw4NG1pd1z102J"
   ACCESS_TOKEN_EXPIRED="1d"
   REFRESH_TOKEN_SECRET_KEY="LcnlpiuHIJ6eS51u1mcOdk0P49r2Crwu"
   REFRESH_TOKEN_EXPIRED="7d"

   # Redis Configuration
   REDIS_URL="redis://localhost:6379"
   REDIS_KEY_PREFIX="post:"
   REDIS_TTL=3600

   # gRPC Configuration
   GRPC_URL="0.0.0.0:50052"
   GRPC_PACKAGE="post"
   GRPC_AUTH_URL="0.0.0.0:50051"
   GRPC_AUTH_PACKAGE="auth"
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Run migrations
   npm run prisma:migrate

   # (Optional) Open Prisma Studio
   npm run prisma:studio
   ```

5. **Generate gRPC code**
   ```bash
   npm run proto:generate
   ```

## 🚀 Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Docker (if available)
```bash
docker build -t post-service .
docker run -p 9002:9002 post-service
```

## 📡 API Endpoints

### Post Management Endpoints

#### Public Endpoints
- `GET /post` - List all posts (paginated)

#### Protected Endpoints
- `POST /post` - Create new post
- `PUT /post/:id` - Update post
- `DELETE /post/batch` - Bulk delete posts

### Query Parameters

#### Pagination
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)

#### Search & Filtering
- `search` (string): Search in title and content
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): Sort order - 'asc' or 'desc' (default: desc)

#### Post List Specific
- `authorId` (string): Filter by author ID
- `page` (number): Page number
- `limit` (number): Items per page

### Health Check
- `GET /health` - Service health status
- `GET /` - Service information

## 🔌 gRPC Services

### PostService
- `CreatePost` - Create a new post
- `GetPost` - Get a single post by ID
- `GetPosts` - Get paginated list of posts
- `UpdatePost` - Update an existing post
- `DeletePost` - Delete a post

## 🔧 Configuration

The service uses a modular configuration system with environment-specific settings:

### App Configuration
- **Name**: Service name and display information
- **Environment**: Development, staging, production
- **Debug**: Debug mode settings
- **CORS**: Cross-origin resource sharing settings

### HTTP Configuration
- **Port**: HTTP server port (default: 9002)
- **Host**: HTTP server host
- **Versioning**: API versioning settings

### Database Configuration
- **URL**: PostgreSQL connection string
- **Migrations**: Database migration settings

### Redis Configuration
- **URL**: Redis connection string
- **Key Prefix**: Cache key prefix
- **TTL**: Cache time-to-live

### gRPC Configuration
- **URL**: gRPC server address
- **Package**: Protocol buffer package name

### Auth Service Integration
- **URL**: Auth service gRPC address for token validation

## 📊 Data Models

### Post Entity
```typescript
interface Post {
  id: string;
  title: string;
  content: string;
  images: string[];
  createdBy: string;
  updatedBy?: string;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  isDeleted: boolean;
}
```

### Post Response DTO
```typescript
interface PostResponseDto {
  id: string;
  title: string;
  content: string;
  createdBy: UserResponseDto;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: UserResponseDto;
  deletedBy?: UserResponseDto;
  deletedAt?: Date;
  isDeleted: boolean;
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

## 📚 API Documentation

When running in development mode, Swagger documentation is available at:
```
http://localhost:9002/docs
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: User authorization
- **Input Validation**: Request validation with class-validator
- **Helmet Security**: Security headers
- **CORS Protection**: Cross-origin request protection
- **Soft Delete**: Audit trail for deleted posts

## 📊 Monitoring

- **Health Checks**: Built-in health monitoring endpoints
- **Sentry Integration**: Error tracking and monitoring
- **Logging**: Structured logging
- **Metrics**: Performance metrics collection

## 🔄 Service Integration

### Auth Service Integration
The Post Service integrates with the Auth Service via gRPC for:
- **Token Validation**: Validate JWT tokens
- **User Information**: Get user details for post creation/updates
- **Authorization**: Check user permissions

### Integration Points
- **gRPC Client**: Connects to Auth Service for authentication
- **User Context**: Extracts user information from JWT tokens
- **Audit Trail**: Tracks user actions on posts

## 🚀 Deployment

### Environment Variables
Ensure all required environment variables are set in your deployment environment.

### Database Migrations
Run database migrations before starting the service:
```bash
npm run prisma:migrate:prod
```

### Health Checks
The service provides health check endpoints for load balancers and monitoring systems.

### Service Dependencies
Ensure the Auth Service is running and accessible before starting the Post Service.

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start in development mode
npm run build           # Build the application
npm run start           # Start in production mode

# Database
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run migrations
npm run prisma:studio   # Open Prisma Studio

# gRPC
npm run proto:generate  # Generate gRPC code

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier

# Testing
npm test                # Run tests
npm run test:watch      # Run tests in watch mode
```

### Code Structure

The service follows a modular architecture with clear separation of concerns:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and data processing
- **DTOs**: Data transfer objects for API contracts
- **Interfaces**: TypeScript interfaces for type safety
- **Guards**: Authentication and authorization guards
- **Interceptors**: Response transformation and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.
