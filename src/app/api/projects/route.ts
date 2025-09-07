import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { generateSlug } from '@/lib/slug';
import { Project } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyTokenEdge(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await getDatabase();
    
    // Get projects with contractor count using aggregation
    const projects = await db.collection('projects').aggregate([
      {
        $lookup: {
          from: 'contractors',
          localField: '_id',
          foreignField: 'project_id',
          as: 'contractors'
        }
      },
      {
        $addFields: {
          contractor_count: { $size: '$contractors' }
        }
      },
      {
        $project: {
          contractors: 0 // Remove contractors array from output
        }
      },
      {
        $sort: { created_at: -1 }
      }
    ]).toArray();

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyTokenEdge(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { name, description, status = 'ongoing' } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Generate slug from project name
    let slug = generateSlug(name);
    
    // Ensure slug is unique
    let counter = 1;
    while (true) {
      const existing = await db.collection('projects').findOne({ slug });
      
      if (!existing) {
        break;
      }
      
      slug = `${generateSlug(name)}-${counter}`;
      counter++;
    }

    const projectData = {
      name,
      slug,
      description,
      status,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.collection('projects').insertOne(projectData);

    // Fetch the created project
    const project = await db.collection('projects').findOne({ _id: result.insertedId }) as unknown as Project;

    return NextResponse.json(
      { message: 'Project created successfully', project },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
