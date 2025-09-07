import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'attendance_app';

// Ensure MongoDB URI has proper SSL parameters for production
const getMongoURI = () => {
  if (MONGODB_URI.includes('mongodb+srv://')) {
    // For Atlas, ensure SSL parameters are included
    const uri = new URL(MONGODB_URI);
    uri.searchParams.set('retryWrites', 'true');
    uri.searchParams.set('w', 'majority');
    uri.searchParams.set('ssl', 'true');
    return uri.toString();
  }
  return MONGODB_URI;
};

export async function connectToDatabase(): Promise<{ db: Db; client: MongoClient }> {
  if (db && client) {
    return { db, client };
  }

  // Configure MongoDB client options for Vercel serverless environment
  const clientOptions = {
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 5, // Maintain a minimum of 5 socket connections
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    tls: true, // Enable TLS/SSL
    tlsAllowInvalidCertificates: false, // Don't allow invalid certificates
    tlsAllowInvalidHostnames: false, // Don't allow invalid hostnames
  };

  // Retry connection logic for serverless environments
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`MongoDB connection attempt ${attempt}/${maxRetries}`);
      client = new MongoClient(getMongoURI(), clientOptions);
      await client.connect();
      db = client.db(MONGODB_DB);
      console.log('Connected to MongoDB successfully');
      return { db, client };
    } catch (error) {
      lastError = error;
      console.error(`MongoDB connection attempt ${attempt} failed:`, error);
      
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          console.error('Error closing client:', closeError);
        }
        client = null as unknown as MongoClient;
      }
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('All MongoDB connection attempts failed');
  throw lastError;
}

export async function getDatabase(): Promise<Db> {
  if (!db) {
    const { db: database } = await connectToDatabase();
    return database;
  }
  return db;
}

export async function getClient(): Promise<MongoClient> {
  if (!client) {
    const { client: mongoClient } = await connectToDatabase();
    return mongoClient;
  }
  return client;
}

// Default export for backward compatibility
export default {
  getDatabase,
  getClient,
  connectToDatabase
};

// Database initialization function
export async function initializeDatabase() {
  try {
    const { db: database } = await connectToDatabase();
    
    // Create collections with validation (optional)
    const collections = ['users', 'projects', 'contractors', 'attendance'];
    
    for (const collectionName of collections) {
      try {
        await database.createCollection(collectionName);
        console.log(`Collection ${collectionName} created or already exists`);
      } catch {
        // Collection might already exist, which is fine
        console.log(`Collection ${collectionName} already exists`);
      }
    }

    // Create indexes for better performance
    await database.collection('users').createIndex({ email: 1 }, { unique: true });
    await database.collection('attendance').createIndex({ contractor_id: 1, date: 1 }, { unique: true });
    await database.collection('contractors').createIndex({ project_id: 1 });
    await database.collection('attendance').createIndex({ project_id: 1 });

    // Insert default admin user if not exists
    const existingAdmin = await database.collection('users').findOne({ email: 'admin@gmail.com' });
    
    if (!existingAdmin) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await database.collection('users').insertOne({
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'admin',
        created_at: new Date()
      });
      console.log('Default admin user created: admin@gmail.com / admin123');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Close connection (useful for cleanup)
export async function closeConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}