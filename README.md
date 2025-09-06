# Next.js Attendance Management System

A comprehensive attendance management system built with Next.js, TypeScript, MySQL, and Tailwind CSS. This application allows managers to create projects, add contractors, and manage their attendance with Excel export functionality.

## Features

- **Authentication System**: Secure login with JWT tokens
- **Project Management**: Create and manage multiple projects
- **Contractor Management**: Add and manage contractors for each project
- **Attendance Tracking**: Mark daily attendance with present/absent status
- **Overtime Tracking**: Track overtime hours for each contractor
- **Excel Export**: Export attendance data to Excel format
- **Responsive Design**: Modern UI that works on all devices

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MySQL
- **Authentication**: JWT tokens with bcrypt password hashing
- **Export**: Excel files using xlsx library

## Prerequisites

- Node.js 18+ 
- MySQL server running locally
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd next-attendance-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MySQL database**
   - Make sure MySQL is running on your local machine
   - The application will automatically create the database and tables on first run
   - Default connection settings:
     - Host: localhost
     - User: root
     - Password: (empty - update in `.env.local` if you have a password)
     - Database: attendance_app

4. **Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=attendance_app
   ```

5. **Initialize the database**
   ```bash
   npm run dev
   ```
   Then visit: `http://localhost:3000/api/init-db`

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Default Login Credentials

- **Email**: admin@gmail.com
- **Password**: admin123

## Usage

### 1. Login
- Use the default credentials or create new users through the database
- The system uses JWT tokens for authentication

### 2. Dashboard
- View all projects
- Create new projects
- Access project attendance management

### 3. Project Management
- Create projects with name and description
- Set project status (ongoing, completed, paused)
- View contractor count for each project

### 4. Contractor Management
- Add contractors to projects
- Include name, email, and phone number
- Edit or delete contractor information

### 5. Attendance Management
- Select a date to mark attendance
- Use radio buttons to mark present/absent
- Track overtime hours
- Save attendance data

### 6. Excel Export
- Select date range for export
- Download comprehensive Excel report
- Includes attendance summary and totals

## Database Schema

### Users Table
- `id`: Primary key
- `email`: Unique email address
- `password`: Hashed password
- `role`: User role (admin/manager)
- `created_at`: Timestamp

### Projects Table
- `id`: Primary key
- `name`: Project name
- `description`: Project description
- `status`: Project status
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Contractors Table
- `id`: Primary key
- `project_id`: Foreign key to projects
- `name`: Contractor name
- `email`: Contractor email
- `phone`: Contractor phone
- `created_at`: Timestamp

### Attendance Table
- `id`: Primary key
- `contractor_id`: Foreign key to contractors
- `project_id`: Foreign key to projects
- `date`: Attendance date
- `status`: Present/Absent
- `overtime_hours`: Overtime hours worked
- `work_time`: Work time details
- `created_at`: Timestamp
- `updated_at`: Timestamp

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Contractors
- `GET /api/projects/[id]/contractors` - Get project contractors
- `POST /api/projects/[id]/contractors` - Add contractor
- `PUT /api/contractors/[id]` - Update contractor
- `DELETE /api/contractors/[id]` - Delete contractor

### Attendance
- `GET /api/attendance` - Get attendance data
- `POST /api/attendance` - Save attendance data

### Export
- `GET /api/export/attendance` - Export attendance to Excel

## Development

### Project Structure
```
src/
├── app/
│   ├── api/           # API routes
│   ├── dashboard/     # Dashboard page
│   ├── login/         # Login page
│   ├── attendance/    # Attendance pages
│   └── page.tsx       # Home page (redirects to login)
├── lib/
│   ├── db.ts          # Database connection
│   └── auth.ts        # Authentication utilities
└── middleware.ts      # Route protection
```

### Key Features Implementation

1. **Authentication**: JWT-based authentication with HTTP-only cookies
2. **Database**: MySQL with connection pooling
3. **UI**: Responsive design with Tailwind CSS
4. **Export**: Excel generation with multiple sheets
5. **State Management**: React hooks for local state

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- HTTP-only cookies for token storage
- Route protection middleware
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository.