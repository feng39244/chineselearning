# Authentication System Implementation

## Overview

The Chinese Learning App now includes a simple username/password authentication system. Each user has their own isolated data (characters, quiz progress, etc.).

## Features Implemented

### 1. User Registration & Login
- **Registration**: Create new account with username and password
- **Login**: Access your account with credentials
- **Session Management**: Cookie-based sessions (30-day expiry)
- **Logout**: End your session at any time

### 2. Data Isolation
Each user has completely separate:
- Character lists (`data/users/{username}/characters.csv`)
- Quiz progress (`data/users/{username}/progress.csv`)
- Learning history

### 3. Security Features
- Password hashing using SHA-256
- HTTP-only cookies (prevents XSS)
- Username validation (alphanumeric + underscores only)
- Password minimum length (4 characters)

## How to Use

### First Time Setup

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Open browser**: http://localhost:3000

3. **Create Account**:
   - Click "Create one" on the login page
   - Enter username (2-20 characters, letters/numbers/underscores)
   - Enter password (minimum 4 characters)
   - Confirm password
   - Click "Register"

4. **Start Learning**:
   - Upload your characters
   - Take quizzes
   - Track your progress

### Returning Users

1. **Login**:
   - Enter your username
   - Enter your password
   - Click "Login"

2. **Your data will be loaded automatically**

### Logout

- Click the "Logout" button in the header (visible when logged in)

## File Structure

```
data/
├── users.csv                    # User database (username, hashed password)
└── users/
    ├── john/
    │   ├── characters.csv       # John's character list
    │   └── progress.csv         # John's quiz progress
    ├── jane/
    │   ├── characters.csv       # Jane's character list
    │   └── progress.csv         # Jane's quiz progress
    └── ...
```

## API Endpoints

### Authentication API (`/api/auth`)

**POST** - Login, Register, or Logout
```json
// Register
{
  "action": "register",
  "username": "john",
  "password": "mypassword"
}

// Login
{
  "action": "login",
  "username": "john",
  "password": "mypassword"
}

// Logout
{
  "action": "logout"
}
```

**GET** - Check current session
```json
// Response
{
  "user": "john"  // or null if not logged in
}
```

### Characters API (`/api/characters`)

- **GET**: Retrieve logged-in user's characters
- **POST**: Add characters to logged-in user's list
- **DELETE**: Remove characters from logged-in user's list

Requires authentication (checked via cookie).

### Progress API (`/api/progress`)

- **GET**: Retrieve logged-in user's quiz progress
- **POST**: Update logged-in user's quiz progress
- **DELETE**: Clear logged-in user's quiz progress

Requires authentication (checked via cookie).

## Components

### 1. AuthForm (`components/auth-form.tsx`)
- Handles login and registration UI
- Toggles between login/register modes
- Form validation and error handling

### 2. Updated App (`app/page.tsx`)
- Checks authentication on load
- Shows AuthForm if not logged in
- Shows main app with user info if logged in
- Provides logout functionality

## Validation Rules

### Username
- 2-20 characters
- Only letters, numbers, and underscores
- Must be unique (no duplicates)

### Password
- Minimum 4 characters
- No maximum length
- Not stored in plain text (SHA-256 hashed)

## Testing the Implementation

### Test 1: Registration Flow
1. Visit http://localhost:3000
2. Click "Create one"
3. Enter username: `testuser1`
4. Enter password: `test1234`
5. Confirm password: `test1234`
6. Click "Register"
7. You should be logged in and see the dashboard

### Test 2: Login Flow
1. Logout if logged in
2. Enter username: `testuser1`
3. Enter password: `test1234`
4. Click "Login"
5. You should be logged in

### Test 3: Data Isolation
1. Login as `testuser1`
2. Upload some characters
3. Take a quiz
4. Logout
5. Register as `testuser2`
6. You should see no characters (empty state)
7. Upload different characters
8. Logout and login as `testuser1`
9. Your original characters should be there

### Test 4: Session Persistence
1. Login
2. Close browser
3. Reopen browser and visit http://localhost:3000
4. You should still be logged in (cookie persists)

## Troubleshooting

### "Not authenticated" error
- Make sure you're logged in
- Check if your session cookie expired (30 days)
- Try logging in again

### "Username already exists"
- Choose a different username
- Or login with the existing username if it's yours

### "Invalid username or password"
- Check your credentials
- Username is case-sensitive
- Make sure you registered the account

### Session not persisting
- Check browser cookie settings
- Ensure cookies are enabled
- Check browser console for errors

## Security Notes

### For Development
- Passwords are hashed with SHA-256
- Sessions use HTTP-only cookies
- No passwords stored in plain text

### For Production (Future Improvements)
Consider adding:
- HTTPS requirement (secure cookies)
- Better password hashing (bcrypt/argon2)
- Rate limiting on login attempts
- Password strength requirements
- Email verification
- Password reset functionality
- Two-factor authentication
- CSRF protection

## Data Management

### Backup User Data
```bash
# Backup all users
cp -r data/ backup/

# Backup specific user
cp -r data/users/john/ backup/john/
```

### Delete User Account
1. Remove user from `data/users.csv`
2. Delete user folder: `data/users/{username}/`

### View User Data
```bash
# View user's characters
cat data/users/john/characters.csv

# View user's progress
cat data/users/john/progress.csv
```

## Conclusion

The authentication system is fully functional and provides basic user account management. Each user can now have their own personalized learning experience with isolated data storage.

