# 🚀 Deployment Guide for Next.js Attendance App

## 📋 Prerequisites

- MongoDB Atlas account with a cluster
- Vercel account
- GitHub repository (optional, for automatic deployments)

## 🔧 Environment Variables for Vercel

Set these environment variables in your Vercel project settings:

### Required Variables:
```bash
MONGODB_URI=mongodb+srv://resources_db_user:V3LO1UqtirFEjhWx@cluster0.gmdhmuz.mongodb.net/attendance_app?retryWrites=true&w=majority
MONGODB_DB=attendance_app
JWT_SECRET=175b4dd3809c02c8ad3e5f13da22fb393c91daf2ccf13aa197b1692ddf0c5c48b17707cc7eb37e7db6f386d76af16f8637c262a0a4b7778f354113fe4cad2693
```

### How to Set Environment Variables in Vercel:

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable for **Production**, **Preview**, and **Development** environments

## 🗄️ MongoDB Atlas Configuration

### 1. Network Access
- Go to **MongoDB Atlas** → **Network Access**
- Add IP Address: `0.0.0.0/0` (allows all IPs - Vercel uses dynamic IPs)
- Or add Vercel's specific IP ranges for better security

### 2. Database User
- Ensure your database user has read/write permissions
- Username: `resources_db_user`
- Password: `V3LO1UqtirFEjhWx`

### 3. Connection String
- Use the connection string provided above
- Make sure it includes the database name and SSL parameters

## 🚀 Deployment Methods

### Method 1: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

### Method 2: Git Integration (Recommended)
1. Push your code to GitHub:
```bash
git add .
git commit -m "Deploy MongoDB attendance app"
git push origin main
```

2. Connect your GitHub repo to Vercel:
   - Go to Vercel dashboard
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-deploy on every push

## 🔄 Post-Deployment Steps

### 1. Initialize Database
After deployment, visit your production URL + `/api/init-db`:
```
https://your-app.vercel.app/api/init-db
```

This will:
- Create necessary collections
- Set up indexes
- Create default admin user

### 2. Test Login
- URL: `https://your-app.vercel.app/login`
- Email: `admin@gmail.com`
- Password: `admin123`

## 🛠️ Troubleshooting

### SSL Connection Issues
If you encounter SSL/TLS errors, the app includes multiple connection fallbacks:
- Vercel Optimized configuration
- Minimal TLS configuration
- No compression configuration
- Direct connection fallback

### Common Issues:

1. **"MongoDB connection failed"**
   - Check environment variables are set correctly
   - Verify MongoDB Atlas network access allows all IPs
   - Ensure database user has proper permissions

2. **"Invalid token" errors**
   - Make sure JWT_SECRET is set in environment variables
   - Initialize database first via `/api/init-db`

3. **Build failures**
   - Check Node.js version (requires >=18.0.0)
   - Ensure all dependencies are installed

## 📊 Monitoring

### Vercel Analytics
- Monitor function execution times
- Check for errors in Vercel dashboard
- Review function logs for debugging

### MongoDB Atlas Monitoring
- Monitor connection count
- Check query performance
- Review database metrics

## 🔒 Security Best Practices

1. **Environment Variables**
   - Never commit sensitive data to Git
   - Use strong, unique JWT secrets
   - Rotate secrets regularly

2. **MongoDB Security**
   - Use strong passwords
   - Restrict network access when possible
   - Enable MongoDB Atlas security features

3. **Application Security**
   - All API routes are protected with JWT authentication
   - Input validation on all endpoints
   - Secure password hashing with bcrypt

## 🎯 Production Checklist

- ✅ Environment variables set in Vercel
- ✅ MongoDB Atlas network access configured
- ✅ Database initialized via `/api/init-db`
- ✅ Login functionality tested
- ✅ All features working (projects, contractors, attendance, overtime, export)
- ✅ SSL/TLS connection working
- ✅ Error monitoring set up

## 📞 Support

If you encounter issues:
1. Check Vercel function logs
2. Verify MongoDB Atlas connection
3. Test environment variables
4. Review this deployment guide

Your attendance management system is now live and ready to use! 🎉
