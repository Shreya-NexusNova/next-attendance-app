# MongoDB Setup Guide

## Step 1: Set up MongoDB Atlas (Free)

1. **Go to [MongoDB Atlas](https://www.mongodb.com/atlas)**
2. **Create a free account**
3. **Create a new cluster**:
   - Choose "M0 Sandbox" (Free tier)
   - Select a region close to your users
   - Name your cluster (e.g., "attendance-app")

4. **Set up database access**:
   - Go to "Database Access"
   - Add a new database user
   - Username: `attendance_user`
   - Password: Generate a strong password
   - Database User Privileges: "Read and write to any database"

5. **Set up network access**:
   - Go to "Network Access"
   - Add IP Address: `0.0.0.0/0` (allow from anywhere)
   - Or add Vercel's IP ranges for better security

6. **Get connection string**:
   - Go to "Clusters" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

## Step 2: Environment Variables

Create a `.env.local` file in your project root:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://attendance_user:your_password@cluster0.abc123.mongodb.net/
MONGODB_DB=attendance_app

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## Step 3: Vercel Environment Variables

In your Vercel dashboard, go to **Project Settings → Environment Variables** and add:

```
MONGODB_URI=mongodb+srv://attendance_user:your_password@cluster0.abc123.mongodb.net/
MONGODB_DB=attendance_app
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## Step 4: Test the Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Test locally**:
   ```bash
   npm run dev
   ```
   Then visit: `http://localhost:3000/api/db-status`

3. **Initialize database**:
   Visit: `http://localhost:3000/api/init-db`

4. **Deploy to Vercel**:
   ```bash
   git add .
   git commit -m "Migrate to MongoDB"
   git push
   ```

5. **Test on Vercel**:
   - Visit: `https://your-app.vercel.app/api/db-status`
   - Initialize: `https://your-app.vercel.app/api/init-db`

## Default Login Credentials

- **Email**: admin@gmail.com
- **Password**: admin123

## Benefits of MongoDB Atlas

✅ **No server management** - MongoDB handles everything  
✅ **Automatic scaling** - Scales with your app  
✅ **Built-in security** - SSL, authentication, IP whitelisting  
✅ **Free tier** - 512MB free forever  
✅ **No connection issues** - Works perfectly with Vercel  
✅ **Global clusters** - Choose region closest to your users  
✅ **Automatic backups** - Built-in backup system  

## Security Notes

- Use strong passwords for database users
- Consider IP whitelisting for production
- Enable MongoDB Atlas security features
- Regular backups are automatic with Atlas
- SSL connections are enabled by default

## Troubleshooting

1. **Connection issues**: Check your connection string format
2. **Authentication errors**: Verify username/password
3. **Network access**: Ensure IP is whitelisted
4. **Database not found**: The app will create collections automatically

## Migration Complete! 🎉

Your app is now using MongoDB instead of MySQL. No more database setup headaches!
