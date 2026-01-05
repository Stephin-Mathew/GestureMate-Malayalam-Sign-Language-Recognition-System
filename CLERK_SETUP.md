# Clerk Authentication Setup

This project has been integrated with Clerk for Google authentication. Follow these steps to complete the setup:

## 1. Environment Variables Setup

Create a `.env.local` file in the `my-app` directory with your Clerk keys:

```env
# Clerk Environment Variables
# Get these keys from https://dashboard.clerk.com/ -> API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Clerk URLs (optional - Clerk will provide defaults)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

## 2. Clerk Dashboard Setup

1. Go to [https://dashboard.clerk.com/](https://dashboard.clerk.com/)
2. Create a new application or use an existing one
3. In the API Keys section, copy your publishable key and secret key
4. Update the `.env.local` file with these keys

## 3. Enable Google Authentication

1. In your Clerk dashboard, go to **Social Connections**
2. Enable **Google** as a social provider
3. Configure the Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs (Clerk will provide these)
   - Copy the Client ID and Client Secret to Clerk

## 4. Test the Integration

1. Start the development server: `npm run dev`
2. Visit `http://localhost:3000`
3. You should be redirected to the login page
4. Click on "Continue with Google" to test authentication
5. After successful authentication, you should be redirected to the home page

## 5. What's Changed

### Authentication Flow
- **Before**: Custom JWT-based authentication with MongoDB user storage
- **After**: Clerk-managed authentication with Google OAuth

### Updated Files
- `pages/_app.js`: Wrapped with ClerkProvider
- `pages/login.js`: Now uses Clerk's SignIn component
- `pages/signup.js`: Now uses Clerk's SignUp component
- `components/Navigation.js`: Uses Clerk's UserButton
- `pages/index.js`: Uses Clerk's useAuth hook for authentication checks
- `lib/auth.js`: Updated with deprecation warnings (can be removed later)

### Removed Files
- `pages/api/auth/`: All authentication API routes (login, signup, logout, me)

### Preserved Files
- `models/User.js`: Kept for potential additional user data storage
- Database connection and other MongoDB-related code

## 6. Clerk Features Now Available

- **Google Authentication**: One-click sign-in with Google
- **User Management**: Automatic user profile management
- **Session Management**: Secure session handling
- **User Button**: Dropdown with account management options
- **Protected Routes**: Easy route protection with Clerk middleware

## 7. Next Steps

1. Complete the environment setup as described above
2. Test the Google authentication flow
3. Consider implementing Clerk middleware for route protection
4. Update any remaining references to the old authentication system

## 8. Troubleshooting

- **Environment variables not loading**: Make sure `.env.local` is in the `my-app` directory
- **Google OAuth not working**: Check that Google credentials are correctly configured in Clerk
- **Styling issues**: Clerk components are customizable via the `appearance` prop

For more information, visit the [Clerk Next.js documentation](https://clerk.com/docs/quickstarts/nextjs).
