```
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "username": "testuser",
    "role": "user"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

Response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "role": "user",
    "profile": {...}
  }
}
```

**Get Profile (requires token):**
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Database (SQLite)
```sql
users
├── id (PRIMARY KEY)
├── username (UNIQUE)
├── email (UNIQUE)
├── password (hashed with bcrypt)
├── role (user/artisan/admin)
├── profileJson (JSON string)
├── createdAt
└── updatedAt
```

### Profile JSON
```json
{
  "hasCompletedOnboarding": true,
  "interests": ["cheongsam", "mahjong", "letterpress"],
  "uploadedFaceProfileId": "face-1234567890"
}
```

## 🛠️ Configuration

### Backend Environment (.env)
```env
# Optional: Set a custom JWT secret
JWT_SECRET=your-secret-key-here

# Database path (default: database.sqlite)
DATABASE_PATH=database.sqlite

# Node environment
NODE_ENV=development
```

### Frontend Environment (.env)
```env
# API base URL (default: /api)
VITE_API_BASE_URL=http://localhost:3001/api
```

## 🔧 Common Tasks

### Reset Database
```bash
cd server
rm database.sqlite
npm run start:dev  # Tables auto-recreate
```

### View Registered Users
```bash
sqlite3 server/database.sqlite
> SELECT id, username, email, role FROM users;
> .quit
```

### Change JWT Secret (Production)
```bash
# server/.env
JWT_SECRET=generate-a-strong-random-secret-key
```

### Protect a New Endpoint
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/protected')
export class MyController {
  @Get()
  @UseGuards(AuthGuard)  // ← Add this!
  async myProtectedRoute() {
    return { message: 'This requires auth!' };
  }
}
```
