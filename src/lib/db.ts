import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'attendance_app';

export async function connectToDatabase(): Promise<{ db: Db; client: MongoClient }> {
  if (db && client) {
    return { db, client };
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(MONGODB_DB);
    console.log('Connected to MongoDB');
    return { db, client };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
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
      } catch (error) {
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