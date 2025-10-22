# User Management Backend

A secure, scalable user management system built with NestJS, PostgreSQL, and JWT authentication.

## Features

- 🔐 Secure JWT authentication with refresh tokens
- 👥 User management with role-based access control
- 💼 Wallet address management (one-to-many relationship)
- 🛡️ Security features (rate limiting, validation, encryption)
- 📚 Auto-generated API documentation
- 🗄️ PostgreSQL database with TypeORM

## Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Access tokens (15min) + Refresh tokens (7days)
- **Rate Limiting**: Configurable request throttling
- **Input Validation**: Class-validator with DTOs
- **CORS Protection**: Configurable origins
- **Helmet**: Security headers
- **Role-based Access**: Admin/User permissions

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database:
```sql
CREATE DATABASE user_management;
```

3. Copy environment variables:
```bash
cp env.example .env
```

4. Update `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=user_management

JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here_minimum_32_characters
```

5. Start the development server:
```bash
npm run start:dev
```

6. API Documentation: [http://localhost:3001/api](http://localhost:3001/api)

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/change-password` - Change password

### Users (Protected)
- `GET /users` - Get all users (Admin only)
- `GET /users/profile` - Get current user profile
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user (Admin only)
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user (Admin only)

### Wallets (Protected)
- `GET /wallets` - Get user wallets
- `GET /wallets/:id` - Get wallet by ID
- `POST /wallets` - Add wallet
- `PATCH /wallets/:id` - Update wallet
- `DELETE /wallets/:id` - Delete wallet

## Database Schema

### Users Table
```sql
- id: UUID (Primary Key)
- email: VARCHAR (Unique)
- password: VARCHAR (Hashed)
- role: ENUM ('admin', 'user')
- isActive: BOOLEAN
- lastLoginAt: TIMESTAMP
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

### Wallets Table
```sql
- id: UUID (Primary Key)
- address: VARCHAR (Unique)
- label: VARCHAR (Optional)
- isActive: BOOLEAN
- userId: UUID (Foreign Key)
- createdAt: TIMESTAMP
- updatedAt: TIMESTAMP
```

## Security Configuration

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=user_management

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here_minimum_32_characters
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Integration with Python Project

### 1. User Registration
When a user registers in your Python project, call the backend API:

```python
import requests

def register_user(email, password):
    response = requests.post('http://localhost:3001/auth/register', json={
        'email': email,
        'password': password
    })
    return response.json()
```

### 2. User Login
When a user logs in, verify credentials with the backend:

```python
def login_user(email, password):
    response = requests.post('http://localhost:3001/auth/login', json={
        'email': email,
        'password': password
    })
    return response.json()
```

### 3. Add Wallet Address
When a user connects a wallet, add it to their account:

```python
def add_wallet(user_id, wallet_address, label=None):
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.post('http://localhost:3001/wallets', 
                           json={
                               'address': wallet_address,
                               'label': label
                           },
                           headers=headers)
    return response.json()
```

### 4. Verify User Status
Check if user is active and has required permissions:

```python
def verify_user(user_id, access_token):
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(f'http://localhost:3001/users/{user_id}', 
                           headers=headers)
    return response.json()
```

## Production Deployment

### 1. Environment Setup
```env
NODE_ENV=production
DB_HOST=your_production_db_host
DB_PASSWORD=your_secure_password
JWT_SECRET=your_production_jwt_secret_32_chars_minimum
JWT_REFRESH_SECRET=your_production_refresh_secret_32_chars_minimum
```

### 2. Database Migration
```bash
# Disable synchronize in production
# Use migrations instead
npm run build
npm run start:prod
```

### 3. Security Checklist
- [ ] Change default JWT secrets
- [ ] Use strong database passwords
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Use environment variables
- [ ] Enable database SSL
- [ ] Set up monitoring

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + Passport
- **Validation**: Class-validator
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, bcrypt, rate limiting
- **Testing**: Jest
