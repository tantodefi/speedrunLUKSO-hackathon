# Future Features

This directory contains features that are currently in development or planned for future implementation.

## Comments API
Located in: `api/submissions/submissionId/comments/`
- Purpose: Allows admins to add comments to submissions
- Status: Ready for implementation
- Dependencies: 
  - NextAuth for authentication
  - Database integration for storing comments

To implement this feature:
1. Move the route back to `app/api/submissions/[submissionId]/comments/`
2. Update types if needed based on Next.js version
3. Test the API endpoints
4. Implement the frontend components 